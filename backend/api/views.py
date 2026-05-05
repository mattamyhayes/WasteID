import json
import io
from django.http import HttpResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Chemical, Mixture, MixtureComponent, WasteDetermination
from .serializers import (ChemicalSerializer, MixtureSerializer,
                           MixtureComponentSerializer, WasteDeterminationSerializer,
                           MixtureCreateSerializer)
from .determination import determine_hazardous_waste


class ChemicalViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Chemical.objects.all()
    serializer_class = ChemicalSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        q = self.request.query_params.get('q', '')
        category = self.request.query_params.get('category', '')
        if q:
            from django.db.models import Q
            qs = qs.filter(
                Q(name__icontains=q) |
                Q(cas_number__icontains=q) |
                Q(epa_waste_code__icontains=q) |
                Q(synonyms__icontains=q)
            )
        if category:
            qs = qs.filter(category=category)
        return qs[:100]


class MixtureViewSet(viewsets.ModelViewSet):
    queryset = Mixture.objects.prefetch_related('components__chemical', 'determinations').all()
    serializer_class = MixtureSerializer

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return MixtureCreateSerializer
        return MixtureSerializer

    @action(detail=True, methods=['post'])
    def determine(self, request, pk=None):
        mixture = self.get_object()
        additional_props = request.data.get('additional_props', {})

        result = determine_hazardous_waste(mixture, additional_props)

        det = WasteDetermination.objects.create(
            mixture=mixture,
            is_solid_waste=result['is_solid_waste'],
            is_excluded=result['is_excluded'],
            is_listed_hazardous=result['is_listed_hazardous'],
            has_ignitability=result['has_ignitability'],
            has_corrosivity=result['has_corrosivity'],
            has_reactivity=result['has_reactivity'],
            has_toxicity=result['has_toxicity'],
            is_hazardous_waste=result['is_hazardous_waste'],
            waste_codes=json.dumps(result['waste_codes']),
            reasoning=json.dumps(result['reasoning']),
            recommendations=result['recommendations'],
        )

        result['determination_id'] = det.id
        result['mixture_id'] = mixture.id
        return Response(result)

    @action(detail=True, methods=['get'])
    def report_pdf(self, request, pk=None):
        mixture = self.get_object()
        det = mixture.determinations.order_by('-created_at').first()

        try:
            from reportlab.lib.pagesizes import letter
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib.units import inch
            from reportlab.lib import colors
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
            from reportlab.lib.enums import TA_CENTER

            buffer = io.BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=letter,
                                    leftMargin=inch, rightMargin=inch,
                                    topMargin=inch, bottomMargin=inch)
            styles = getSampleStyleSheet()
            story = []

            title_style = ParagraphStyle('Title', parent=styles['Title'],
                                         fontSize=18, spaceAfter=12, alignment=TA_CENTER)
            story.append(Paragraph('WasteID Hazardous Waste Determination Report', title_style))
            story.append(Paragraph(f'Mixture: {mixture.name}', styles['Heading2']))
            story.append(Spacer(1, 12))

            # Customer / Location / Metadata
            label_style = ParagraphStyle('Label', parent=styles['Normal'], fontSize=10, spaceAfter=4)
            info_rows = [
                ('Customer', mixture.customer_name or '—'),
                ('Location', mixture.customer_location or '—'),
                ('Mixture Created', mixture.created_at.strftime('%Y-%m-%d %H:%M') if mixture.created_at else '—'),
            ]
            if det:
                info_rows.append(('Determination Date', det.created_at.strftime('%Y-%m-%d %H:%M')))
            info_table = Table(
                [[Paragraph(f'<b>{k}</b>', label_style), Paragraph(str(v), label_style)] for k, v in info_rows],
                colWidths=[1.5 * inch, 5.5 * inch]
            )
            info_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('BOX', (0, 0), (-1, -1), 0.5, colors.lightgrey),
                ('INNERGRID', (0, 0), (-1, -1), 0.25, colors.lightgrey),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ]))
            story.append(info_table)
            story.append(Spacer(1, 12))

            if mixture.process_description:
                story.append(Paragraph('Process Description', styles['Heading3']))
                story.append(Paragraph(mixture.process_description.replace('\n', '<br/>'), styles['Normal']))
                story.append(Spacer(1, 8))

            if mixture.notes:
                story.append(Paragraph('Notes', styles['Heading3']))
                story.append(Paragraph(mixture.notes.replace('\n', '<br/>'), styles['Normal']))
                story.append(Spacer(1, 8))

            story.append(Paragraph('Mixture Composition', styles['Heading2']))
            table_data = [['Chemical', 'CAS Number', 'Quantity', 'Unit', 'EPA Code']]
            for comp in mixture.components.all():
                chem = comp.chemical
                table_data.append([
                    comp.component_name,
                    chem.cas_number if chem else '—',
                    str(comp.quantity),
                    comp.unit,
                    chem.epa_waste_code if chem else '—'
                ])

            t = Table(table_data, colWidths=[2.6 * inch, 1.2 * inch, 1 * inch, 1 * inch, 1.2 * inch])
            t.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
            ]))
            story.append(t)
            story.append(Spacer(1, 12))

            if det:
                story.append(HRFlowable(width='100%'))
                story.append(Paragraph('Determination Results', styles['Heading2']))

                status_text = 'HAZARDOUS WASTE' if det.is_hazardous_waste else 'NOT HAZARDOUS WASTE'
                status_color = colors.red if det.is_hazardous_waste else colors.green
                status_style = ParagraphStyle('Status', parent=styles['Normal'],
                                              fontSize=14, textColor=status_color, spaceAfter=6)
                story.append(Paragraph(f'Status: {status_text}', status_style))

                codes = json.loads(det.waste_codes)
                if codes:
                    story.append(Paragraph(f'Applicable Waste Codes: {", ".join(codes)}', styles['Normal']))

                story.append(Spacer(1, 12))
                story.append(Paragraph('Determination Steps', styles['Heading2']))

                reasoning = json.loads(det.reasoning)
                for step in reasoning:
                    story.append(Paragraph(f'Step {step["step"]}: {step["title"]}', styles['Heading3']))
                    story.append(Paragraph(f'Result: {step.get("result", "")}', styles['Normal']))
                    for detail in step.get('details', []):
                        story.append(Paragraph(f'• {detail}', styles['Normal']))
                    story.append(Spacer(1, 6))

                story.append(Spacer(1, 12))
                story.append(Paragraph('Recommendations', styles['Heading2']))
                for line in det.recommendations.split('\n'):
                    if line.strip():
                        story.append(Paragraph(f'• {line}', styles['Normal']))

            story.append(Spacer(1, 24))
            disclaimer_style = ParagraphStyle('Disclaimer', parent=styles['Normal'],
                                              fontSize=8, textColor=colors.grey, spaceAfter=6)
            story.append(Paragraph(
                'DISCLAIMER: This report is for informational purposes only and does not constitute legal advice. '
                'Verify results with qualified environmental professionals and applicable laboratory testing.',
                disclaimer_style
            ))

            doc.build(story)
            buffer.seek(0)

            response = HttpResponse(buffer.read(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="wasteid_report_{mixture.id}.pdf"'
            return response
        except ImportError:
            return Response({'error': 'PDF generation not available'}, status=500)

    @action(detail=True, methods=['get'])
    def export_csv(self, request, pk=None):
        import csv
        mixture = self.get_object()

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="mixture_{mixture.id}.csv"'

        writer = csv.writer(response)
        writer.writerow(['Chemical Name', 'CAS Number', 'EPA Code', 'Category', 'Quantity', 'Unit', 'Notes'])

        for comp in mixture.components.all():
            chem = comp.chemical
            writer.writerow([
                comp.component_name,
                chem.cas_number if chem else '',
                chem.epa_waste_code if chem else '',
                chem.get_category_display() if chem else '',
                comp.quantity,
                comp.unit,
                comp.notes,
            ])

        return response


class MixtureComponentViewSet(viewsets.ModelViewSet):
    queryset = MixtureComponent.objects.all()
    serializer_class = MixtureComponentSerializer


class WasteDeterminationViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = WasteDetermination.objects.all()
    serializer_class = WasteDeterminationSerializer

import json
import io
import logging
import os
import re
from django.conf import settings
from django.core.mail import send_mail
from django.http import HttpResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from .models import (Chemical, Mixture, MixtureComponent, WasteDetermination, Customer,
                     CustomerLocation, Shipper, EPAManifest, Order, Journey, OrderJourney,
                     StateRule, StateValidationResult, MarketplaceListing, Bid, Incinerator,
                     ProfileDocument, SafetyDataSheet, ContactUsSubmission)
from .serializers import (ChemicalSerializer, MixtureSerializer,
                           MixtureComponentSerializer, WasteDeterminationSerializer,
                           MixtureCreateSerializer, CustomerSerializer, CustomerLocationSerializer,
                           ShipperSerializer, EPAManifestSerializer, OrderSerializer, JourneySerializer,
                           StateRuleSerializer, StateValidationResultSerializer,
                           MarketplaceListingSerializer, MarketplaceListingSummarySerializer,
                           BidSerializer, IncineratorSerializer, ProfileDocumentSerializer,
                           SafetyDataSheetSerializer, SafetyDataSheetListSerializer,
                           ContactUsSubmissionSerializer)
from .determination import determine_hazardous_waste, determine_from_sds


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.prefetch_related('locations').all()
    serializer_class = CustomerSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        q = self.request.query_params.get('q', '')
        if q:
            qs = qs.filter(name__icontains=q)
        return qs


class CustomerLocationViewSet(viewsets.ModelViewSet):
    queryset = CustomerLocation.objects.select_related('customer').all()
    serializer_class = CustomerLocationSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        customer_id = self.request.query_params.get('customer', '')
        if customer_id:
            qs = qs.filter(customer_id=customer_id)
        return qs


class ChemicalViewSet(viewsets.ModelViewSet):
    queryset = Chemical.objects.all()
    serializer_class = ChemicalSerializer

    def perform_update(self, serializer):
        # When an imported record is edited, mark it as manually entered
        instance = self.get_object()
        source = serializer.validated_data.get('source', instance.source)
        if instance.source == 'epa_import' and source == 'epa_import':
            serializer.save(source='manual')
        else:
            serializer.save()

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
        # When used for search (q provided), cap at 100 results for performance.
        # Admin list view (no q) relies on DRF pagination.
        if q:
            return qs[:100]
        return qs

class MixtureViewSet(viewsets.ModelViewSet):
    queryset = Mixture.objects.select_related('customer', 'customer_location').prefetch_related('components__chemical', 'determinations').all()
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
            reviewer_name=request.data.get('reviewer_name', ''),
            reviewer_sign_off_date=request.data.get('reviewer_sign_off_date') or None,
        )

        # After determination, mark profile as pending review
        mixture.review_status = 'pending_review'
        mixture.save(update_fields=['review_status'])

        result['determination_id'] = det.id
        result['mixture_id'] = mixture.id
        return Response(result)

    @action(detail=True, methods=['post'])
    def set_review_status(self, request, pk=None):
        mixture = self.get_object()
        new_status = request.data.get('review_status', '')
        if new_status not in ('pending_review', 'approved', 'rejected'):
            return Response({'detail': 'Invalid review status.'}, status=status.HTTP_400_BAD_REQUEST)
        mixture.review_status = new_status
        mixture.save(update_fields=['review_status'])
        return Response({'id': mixture.id, 'review_status': mixture.review_status})

    @action(detail=True, methods=['post'])
    def validate_state_rules(self, request, pk=None):
        """Run state rules validation engine against this mixture."""
        from .state_rules_engine import validate_state_rules
        mixture = self.get_object()
        additional_answers = request.data.get('additional_answers', {})

        result = validate_state_rules(mixture, additional_answers)

        # Save the validation result
        StateValidationResult.objects.create(
            mixture=mixture,
            state_code=result['state_code'],
            overall_result=result['overall_result'],
            rule_results=json.dumps(result['rule_results']),
            additional_data_collected=json.dumps(additional_answers),
        )

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
                ('Transaction ID', mixture.transaction_id or '—'),
                ('Customer', mixture.customer.name if mixture.customer else '—'),
                ('Location', mixture.customer_location.name if mixture.customer_location else '—'),
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

            # Reviewer sign-off section
            if det and det.reviewer_name:
                story.append(HRFlowable(width='100%'))
                story.append(Spacer(1, 8))
                story.append(Paragraph('Reviewer Sign-Off', styles['Heading2']))
                signoff_rows = [
                    ('Reviewed By', det.reviewer_name),
                    ('Sign-Off Date', det.reviewer_sign_off_date.strftime('%Y-%m-%d') if det.reviewer_sign_off_date else '—'),
                ]
                signoff_table = Table(
                    [[Paragraph(f'<b>{k}</b>', label_style), Paragraph(str(v), label_style)] for k, v in signoff_rows],
                    colWidths=[1.5 * inch, 5.5 * inch]
                )
                signoff_table.setStyle(TableStyle([
                    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                    ('BOX', (0, 0), (-1, -1), 0.5, colors.lightgrey),
                    ('INNERGRID', (0, 0), (-1, -1), 0.25, colors.lightgrey),
                    ('LEFTPADDING', (0, 0), (-1, -1), 6),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                    ('TOPPADDING', (0, 0), (-1, -1), 4),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ]))
                story.append(signoff_table)
                story.append(Spacer(1, 8))
                story.append(Paragraph(
                    'By signing off on this determination, the reviewer certifies that they have fully reviewed '
                    'all inputs and outputs of this report and accept full responsibility for the accuracy of this determination.',
                    ParagraphStyle('SignoffNote', parent=styles['Normal'], fontSize=9, textColor=colors.darkgrey)
                ))
                story.append(Spacer(1, 12))

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


class ShipperViewSet(viewsets.ModelViewSet):
    queryset = Shipper.objects.all()
    serializer_class = ShipperSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        q = self.request.query_params.get('q', '')
        if q:
            from django.db.models import Q
            qs = qs.filter(
                Q(company_name__icontains=q) |
                Q(epa_id__icontains=q)
            )
        return qs


class EPAManifestViewSet(viewsets.ModelViewSet):
    queryset = EPAManifest.objects.select_related('generator_shipper').all()
    serializer_class = EPAManifestSerializer

    @action(detail=True, methods=['get'])
    def export_pdf(self, request, pk=None):
        """Generate a PDF matching the EPA Form 8700-22 layout."""
        manifest = self.get_object()
        try:
            from reportlab.lib.pagesizes import letter
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib.units import inch
            from reportlab.lib import colors
            from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer,
                                            Table, TableStyle, HRFlowable)
            from reportlab.lib.enums import TA_CENTER, TA_LEFT
        except ImportError:
            return Response({'error': 'PDF generation not available – reportlab is not installed'}, status=500)

        waste_items = json.loads(manifest.waste_items or '[]')

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter,
                                leftMargin=0.5 * inch, rightMargin=0.5 * inch,
                                topMargin=0.4 * inch, bottomMargin=0.4 * inch)

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle('EPATitle', parent=styles['Title'],
                                      fontSize=11, leading=13, alignment=TA_CENTER,
                                      spaceAfter=2, spaceBefore=0)
        subtitle_style = ParagraphStyle('EPASubtitle', parent=styles['Normal'],
                                         fontSize=8, leading=10, alignment=TA_CENTER,
                                         spaceAfter=4)
        box_label = ParagraphStyle('BoxLabel', parent=styles['Normal'],
                                    fontSize=6.5, leading=8, textColor=colors.HexColor('#444444'))
        box_value = ParagraphStyle('BoxValue', parent=styles['Normal'],
                                    fontSize=9, leading=11)
        section_hdr = ParagraphStyle('SectionHdr', parent=styles['Normal'],
                                      fontSize=7, leading=9, textColor=colors.white)
        small_text = ParagraphStyle('SmallText', parent=styles['Normal'],
                                     fontSize=7, leading=9)
        cert_style = ParagraphStyle('CertText', parent=styles['Normal'],
                                     fontSize=6.5, leading=8.5)

        story = []

        # --- Header ---
        story.append(Paragraph('UNIFORM HAZARDOUS WASTE MANIFEST', title_style))
        story.append(Paragraph('(EPA Form 8700-22)', subtitle_style))

        dark_green = colors.HexColor('#1a5632')
        light_grey = colors.HexColor('#f3f4f6')
        border_color = colors.HexColor('#374151')
        header_bg = colors.HexColor('#1a5632')

        usable_width = letter[0] - 1.0 * inch  # total usable width

        def cell(label, value, min_height=28):
            """Return a small table that looks like a form field box."""
            inner = Table(
                [[Paragraph(label, box_label)], [Paragraph(str(value or ''), box_value)]],
                colWidths=[None],
                rowHeights=[10, max(min_height - 10, 14)],
            )
            inner.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (-1, -1), 3),
                ('RIGHTPADDING', (0, 0), (-1, -1), 3),
                ('TOPPADDING', (0, 0), (-1, -1), 1),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
            ]))
            return inner

        def section_header(number, text, cols=1):
            t = Table(
                [[Paragraph(f'<b>{number}. {text}</b>', section_hdr)]],
                colWidths=[usable_width],
                rowHeights=[14],
            )
            t.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), header_bg),
                ('LEFTPADDING', (0, 0), (-1, -1), 4),
                ('TOPPADDING', (0, 0), (-1, -1), 1),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
            ]))
            return t

        # Build form sections as tables with borders
        full_border = TableStyle([
            ('BOX', (0, 0), (-1, -1), 0.75, border_color),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#d1d5db')),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ])

        half = usable_width / 2
        third = usable_width / 3

        # --- Item 1 & 2: Manifest Tracking Number & Page Info ---
        story.append(section_header(1, 'Generator Information'))
        gen_addr = ', '.join(filter(None, [manifest.generator_address, manifest.generator_city,
                                           manifest.generator_state, manifest.generator_zip]))
        site_addr = manifest.generator_site_address or gen_addr

        row1 = Table([
            [cell('Manifest Tracking Number', manifest.manifest_tracking_number),
             cell('Emergency Response Phone', manifest.emergency_response_phone)],
        ], colWidths=[half, half])
        row1.setStyle(full_border)
        story.append(row1)

        row2 = Table([
            [cell("Generator's Name", manifest.generator_name),
             cell("Generator's US EPA ID No.", manifest.generator_epa_id)],
        ], colWidths=[half + third, usable_width - half - third])
        row2.setStyle(full_border)
        story.append(row2)

        row3 = Table([
            [cell("Generator's Mailing Address", gen_addr)],
        ], colWidths=[usable_width])
        row3.setStyle(full_border)
        story.append(row3)

        row3b = Table([
            [cell("Generator's Site Address (if different from mailing address)", site_addr)],
        ], colWidths=[usable_width])
        row3b.setStyle(full_border)
        story.append(row3b)

        row3c = Table([
            [cell("Generator's Phone", manifest.generator_phone)],
        ], colWidths=[usable_width])
        row3c.setStyle(full_border)
        story.append(row3c)

        story.append(Spacer(1, 4))

        # --- Transporters ---
        story.append(section_header(2, 'Transporters'))
        t1_row = Table([
            [cell('Transporter 1 Company Name', manifest.transporter1_name),
             cell('US EPA ID Number', manifest.transporter1_epa_id)],
        ], colWidths=[half + third, usable_width - half - third])
        t1_row.setStyle(full_border)
        story.append(t1_row)

        if manifest.transporter2_name:
            t2_row = Table([
                [cell('Transporter 2 Company Name', manifest.transporter2_name),
                 cell('US EPA ID Number', manifest.transporter2_epa_id)],
            ], colWidths=[half + third, usable_width - half - third])
            t2_row.setStyle(full_border)
            story.append(t2_row)

        story.append(Spacer(1, 4))

        # --- Designated Facility ---
        story.append(section_header(3, 'Designated Facility'))
        fac_addr = ', '.join(filter(None, [manifest.designated_facility_address,
                                            manifest.designated_facility_city,
                                            manifest.designated_facility_state,
                                            manifest.designated_facility_zip]))
        fac_row1 = Table([
            [cell('Facility Name', manifest.designated_facility_name),
             cell('US EPA ID Number', manifest.designated_facility_epa_id)],
        ], colWidths=[half + third, usable_width - half - third])
        fac_row1.setStyle(full_border)
        story.append(fac_row1)

        fac_row2 = Table([
            [cell('Facility Address', fac_addr),
             cell('Phone', manifest.designated_facility_phone)],
        ], colWidths=[half + third, usable_width - half - third])
        fac_row2.setStyle(full_border)
        story.append(fac_row2)

        story.append(Spacer(1, 4))

        # --- Waste Description Table ---
        story.append(section_header(4, 'US DOT Description / Waste Items'))

        waste_hdr = [
            Paragraph('<b>HM</b>', small_text),
            Paragraph('<b>US DOT Description</b>', small_text),
            Paragraph('<b>Containers<br/>No.</b>', small_text),
            Paragraph('<b>Type</b>', small_text),
            Paragraph('<b>Total<br/>Qty</b>', small_text),
            Paragraph('<b>Unit<br/>Wt/Vol</b>', small_text),
            Paragraph('<b>Waste Codes</b>', small_text),
        ]
        waste_data = [waste_hdr]
        for item in waste_items:
            codes = item.get('waste_codes', '')
            waste_data.append([
                Paragraph('X', small_text),
                Paragraph(str(item.get('dot_description', '')), small_text),
                Paragraph(str(item.get('containers_no', '')), small_text),
                Paragraph(str(item.get('container_type', '')), small_text),
                Paragraph(str(item.get('quantity', '')), small_text),
                Paragraph(str(item.get('unit', '')), small_text),
                Paragraph(str(codes), small_text),
            ])
        # Pad to at least 4 rows (standard EPA form has 4 lines)
        while len(waste_data) < 5:
            waste_data.append([''] * 7)

        waste_cols = [0.3 * inch, 2.6 * inch, 0.6 * inch, 0.6 * inch,
                      0.7 * inch, 0.6 * inch, usable_width - 5.4 * inch]
        wt = Table(waste_data, colWidths=waste_cols, repeatRows=1)
        wt.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), light_grey),
            ('BOX', (0, 0), (-1, -1), 0.75, border_color),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#d1d5db')),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
            ('RIGHTPADDING', (0, 0), (-1, -1), 3),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ]))
        story.append(wt)

        story.append(Spacer(1, 4))

        # --- Special Handling ---
        story.append(section_header(5, 'Special Handling Instructions & Additional Information'))
        handling_text = manifest.special_handling_instructions or ''
        if manifest.additional_info:
            handling_text += '\n' + manifest.additional_info
        sh_row = Table([
            [cell('', handling_text.strip(), min_height=40)],
        ], colWidths=[usable_width])
        sh_row.setStyle(full_border)
        story.append(sh_row)

        story.append(Spacer(1, 4))

        # --- International Shipments ---
        if manifest.international_shipment:
            story.append(section_header(6, 'International Shipments'))
            intl_info = []
            if manifest.import_to_us:
                intl_info.append('Import to US')
            else:
                intl_info.append('Export from US')
            if manifest.port_of_entry_exit:
                intl_info.append(f'Port of entry/exit: {manifest.port_of_entry_exit}')
            if manifest.date_leaving_us:
                intl_info.append(f'Date leaving US: {manifest.date_leaving_us}')
            intl_row = Table([
                [cell('International Shipment Details', '  |  '.join(intl_info))],
            ], colWidths=[usable_width])
            intl_row.setStyle(full_border)
            story.append(intl_row)
            story.append(Spacer(1, 4))

        # --- Generator Certification ---
        cert_num = 7 if manifest.international_shipment else 6
        story.append(section_header(cert_num, "Generator's/Offeror's Certification"))

        cert_text = (
            "I hereby declare that the contents of this consignment are fully and accurately "
            "described above by the proper shipping name, and are classified, packaged, marked "
            "and labeled/placarded, and are in all respects in proper condition for transport "
            "according to applicable international and national governmental regulations. If "
            "export shipment and I am the Primary Exporter, I certify that the contents of this "
            "consignment conform to the terms of the attached EPA Acknowledgment of Consent. "
            "I certify that the waste minimization statement identified in 40 CFR 262.27(a) "
            "(if I am a large quantity generator) or (b) (if I am a small quantity generator) is true."
        )

        cert_checked = '☑' if manifest.generator_certification else '☐'
        cert_row = Table([
            [Paragraph(f'{cert_checked} {cert_text}', cert_style)],
        ], colWidths=[usable_width])
        cert_row.setStyle(full_border)
        story.append(cert_row)

        sig_date = ''
        if manifest.generator_signature_date:
            sig_date = str(manifest.generator_signature_date)
        sig_row = Table([
            [cell('Printed/Typed Name', manifest.generator_printed_name),
             cell('Signature', ''),
             cell('Date', sig_date)],
        ], colWidths=[third, third, third])
        sig_row.setStyle(full_border)
        story.append(sig_row)

        story.append(Spacer(1, 12))

        # --- Footer ---
        footer_style = ParagraphStyle('Footer', parent=styles['Normal'],
                                       fontSize=7, textColor=colors.grey,
                                       alignment=TA_CENTER)
        story.append(Paragraph('EPA Form 8700-22 (Rev. 3-05)', footer_style))
        story.append(Paragraph(
            f'Generated by WasteID — Manifest ID: {manifest.id}  |  '
            f'Status: {manifest.get_status_display()}  |  '
            f'Created: {manifest.created_at.strftime("%Y-%m-%d")}',
            footer_style
        ))

        doc.build(story)
        buffer.seek(0)

        tracking = manifest.manifest_tracking_number or f'manifest_{manifest.id}'
        safe_tracking = ''.join(c if c.isalnum() or c in '-_' else '_' for c in tracking)

        response = HttpResponse(buffer.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="EPA_8700-22_{safe_tracking}.pdf"'
        return response


class JourneyViewSet(viewsets.ModelViewSet):
    queryset = Journey.objects.select_related('mixture', 'customer').all()
    serializer_class = JourneySerializer

    def get_queryset(self):
        qs = super().get_queryset()
        mixture_id = self.request.query_params.get('mixture', '')
        customer_id = self.request.query_params.get('customer', '')
        stage = self.request.query_params.get('stage', '')
        if mixture_id:
            qs = qs.filter(mixture_id=mixture_id)
        if customer_id:
            qs = qs.filter(customer_id=customer_id)
        if stage:
            qs = qs.filter(stage=stage)
        return qs


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.select_related('generator').prefetch_related(
        'profiles', 'potential_shippers', 'journey_records').all()
    serializer_class = OrderSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        status_filter = self.request.query_params.get('status', '')
        if status_filter:
            qs = qs.filter(status=status_filter)
        owner = self.request.query_params.get('owner', '')
        if owner:
            qs = qs.filter(owner_name__icontains=owner)
        return qs

    def perform_create(self, serializer):
        order = serializer.save()
        OrderJourney.objects.create(order=order, stage='open', notes='Order created')

    @action(detail=True, methods=['post'])
    def submit_to_bid(self, request, pk=None):
        order = self.get_object()
        order.status = 'in_quote'
        order.save()
        OrderJourney.objects.create(order=order, stage='in_quote', notes='Submitted to bid')
        return Response(OrderSerializer(order).data)


class StateRuleViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = StateRule.objects.filter(is_active=True)
    serializer_class = StateRuleSerializer


class MarketplaceListingViewSet(viewsets.ModelViewSet):
    queryset = (MarketplaceListing.objects
                .select_related('mixture__customer', 'mixture__customer_location')
                .prefetch_related('mixture__determinations', 'bids')
                .all())
    serializer_class = MarketplaceListingSerializer

    def get_serializer_class(self):
        if self.action == 'list':
            return MarketplaceListingSummarySerializer
        return MarketplaceListingSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        # Filter by status (comma-separated values supported)
        status_param = self.request.query_params.get('status', '')
        if status_param:
            qs = qs.filter(status__in=status_param.split(','))
        # Filter by bid_type_needed
        bid_type = self.request.query_params.get('bid_type_needed', '')
        if bid_type:
            qs = qs.filter(bid_type_needed__in=bid_type.split(','))
        # Filter by generator EPA status
        epa_status = self.request.query_params.get('epa_generator_status', '')
        if epa_status:
            qs = qs.filter(mixture__epa_generator_status__in=epa_status.split(','))
        # Filter by hazardous (requires joining through determinations)
        is_hazardous = self.request.query_params.get('is_hazardous', '')
        if is_hazardous.lower() in ('true', '1', 'yes'):
            qs = qs.filter(mixture__determinations__is_hazardous_waste=True).distinct()
        elif is_hazardous.lower() in ('false', '0', 'no'):
            qs = qs.filter(mixture__determinations__is_hazardous_waste=False).distinct()
        # Filter by state (customer location state)
        state = self.request.query_params.get('state', '')
        if state:
            qs = qs.filter(mixture__customer_location__state__iexact=state)
        # Filter by waste code (substring match on determination.waste_codes JSON)
        waste_code = self.request.query_params.get('waste_code', '')
        if waste_code:
            qs = qs.filter(mixture__determinations__waste_codes__icontains=waste_code).distinct()
        return qs

    def create(self, request, *args, **kwargs):
        mixture_id = request.data.get('mixture')
        if not mixture_id:
            return Response({'detail': 'mixture is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            mixture = Mixture.objects.get(pk=mixture_id)
        except Mixture.DoesNotExist:
            return Response({'detail': 'Profile not found.'}, status=status.HTTP_404_NOT_FOUND)
        if mixture.review_status != 'approved':
            return Response({'detail': 'Only approved profiles can be listed on the marketplace.'},
                            status=status.HTTP_400_BAD_REQUEST)
        if hasattr(mixture, 'marketplace_listing'):
            existing = mixture.marketplace_listing
            if existing.status in ('open', 'bid_accepted'):
                return Response(MarketplaceListingSerializer(existing).data, status=status.HTTP_200_OK)
            # Allow re-listing if previously withdrawn/completed
            existing.status = 'open'
            existing.bid_type_needed = request.data.get('bid_type_needed', existing.bid_type_needed)
            existing.description = request.data.get('description', existing.description)
            existing.preferred_completion_date = request.data.get('preferred_completion_date',
                                                                   existing.preferred_completion_date)
            existing.save()
            return Response(MarketplaceListingSerializer(existing).data, status=status.HTTP_200_OK)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def withdraw(self, request, pk=None):
        listing = self.get_object()
        if listing.status not in ('open',):
            return Response({'detail': 'Only open listings can be withdrawn.'}, status=status.HTTP_400_BAD_REQUEST)
        listing.status = 'withdrawn'
        listing.save()
        # Reject all pending bids
        listing.bids.filter(status='pending').update(status='rejected')
        return Response(MarketplaceListingSerializer(listing).data)

    @action(detail=True, methods=['post'])
    def accept_bid(self, request, pk=None):
        listing = self.get_object()
        bid_id = request.data.get('bid_id')
        if not bid_id:
            return Response({'detail': 'bid_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            bid = listing.bids.get(id=bid_id)
        except Bid.DoesNotExist:
            return Response({'detail': 'Bid not found.'}, status=status.HTTP_404_NOT_FOUND)
        if bid.status != 'pending':
            return Response({'detail': 'Only pending bids can be accepted.'}, status=status.HTTP_400_BAD_REQUEST)
        # Accept the chosen bid
        bid.status = 'accepted'
        bid.save()
        # Reject all other pending bids on this listing
        listing.bids.filter(status='pending').exclude(id=bid.id).update(status='rejected')
        # Update listing status
        listing.status = 'bid_accepted'
        listing.save()
        return Response(MarketplaceListingSerializer(listing).data)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        listing = self.get_object()
        if listing.status != 'bid_accepted':
            return Response({'detail': 'Only listings with an accepted bid can be marked complete.'},
                            status=status.HTTP_400_BAD_REQUEST)
        listing.status = 'completed'
        listing.save()
        return Response(MarketplaceListingSerializer(listing).data)


class BidViewSet(viewsets.ModelViewSet):
    queryset = Bid.objects.select_related('listing__mixture__customer').all()
    serializer_class = BidSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        listing_id = self.request.query_params.get('listing', '')
        if listing_id:
            qs = qs.filter(listing_id=listing_id)
        bid_status = self.request.query_params.get('status', '')
        if bid_status:
            qs = qs.filter(status__in=bid_status.split(','))
        company = self.request.query_params.get('company', '')
        if company:
            qs = qs.filter(bidder_company_name__icontains=company)
        # Filter by waste codes handled (JSON array contains a value)
        waste_code = self.request.query_params.get('waste_code', '')
        if waste_code:
            qs = qs.filter(waste_codes_handled__icontains=waste_code)
        # Filter by service area state
        state = self.request.query_params.get('state', '')
        if state:
            qs = qs.filter(service_area_states__icontains=state)
        return qs

    @action(detail=True, methods=['post'])
    def withdraw(self, request, pk=None):
        bid = self.get_object()
        if bid.status != 'pending':
            return Response({'detail': 'Only pending bids can be withdrawn.'}, status=status.HTTP_400_BAD_REQUEST)
        bid.status = 'withdrawn'
        bid.save()
        return Response(BidSerializer(bid).data)


class IncineratorViewSet(viewsets.ModelViewSet):
    queryset = Incinerator.objects.all()
    serializer_class = IncineratorSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        q = self.request.query_params.get('q', '')
        if q:
            qs = qs.filter(name__icontains=q)
        return qs


import os
from rest_framework.parsers import MultiPartParser, FormParser

# Allowed file extensions for document uploads
ALLOWED_EXTENSIONS = {'.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt', '.png', '.jpg', '.jpeg', '.tif', '.tiff'}
# Blocked extensions that could be harmful
BLOCKED_EXTENSIONS = {'.exe', '.bat', '.cmd', '.com', '.msi', '.scr', '.pif', '.js', '.vbs',
                      '.wsf', '.ps1', '.sh', '.bash', '.php', '.py', '.rb', '.pl', '.jar',
                      '.dll', '.sys', '.htm', '.html', '.svg', '.swf'}
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB


class ProfileDocumentViewSet(viewsets.ModelViewSet):
    queryset = ProfileDocument.objects.select_related('mixture').all()
    serializer_class = ProfileDocumentSerializer
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        qs = super().get_queryset()
        mixture_id = self.request.query_params.get('mixture')
        if mixture_id:
            qs = qs.filter(mixture_id=mixture_id)
        return qs

    def _validate_file(self, uploaded_file):
        """Validate the uploaded file for security."""
        if not uploaded_file:
            return 'No file provided.'
        # Check file size
        if uploaded_file.size > MAX_FILE_SIZE:
            return f'File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)} MB.'
        # Check extension
        _, ext = os.path.splitext(uploaded_file.name)
        ext = ext.lower()
        if ext in BLOCKED_EXTENSIONS:
            return f'File type "{ext}" is not allowed for security reasons.'
        if ext not in ALLOWED_EXTENSIONS:
            return f'File type "{ext}" is not supported. Allowed: {", ".join(sorted(ALLOWED_EXTENSIONS))}'
        # Check for null bytes in filename
        if '\x00' in uploaded_file.name:
            return 'Invalid filename.'
        return None

    def _generate_stored_filename(self, mixture, file_type, original_filename):
        """Generate stored filename: {profile_number}{SDS|A}{increment}.{ext}"""
        profile_number = mixture.transaction_id
        type_suffix = file_type  # 'SDS' or 'A'
        # Count existing documents of this type for this mixture
        existing_count = ProfileDocument.objects.filter(
            mixture=mixture, file_type=file_type
        ).count()
        increment = existing_count + 1
        _, ext = os.path.splitext(original_filename)
        return f"{profile_number}_{type_suffix}{increment}{ext}"

    def create(self, request, *args, **kwargs):
        uploaded_file = request.FILES.get('file')
        error = self._validate_file(uploaded_file)
        if error:
            return Response({'detail': error}, status=status.HTTP_400_BAD_REQUEST)

        mixture_id = request.data.get('mixture')
        file_type = request.data.get('file_type')
        short_name = request.data.get('short_name', '').strip()

        if not mixture_id:
            return Response({'detail': 'mixture is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if file_type not in ('SDS', 'A'):
            return Response({'detail': 'file_type must be "SDS" or "A".'}, status=status.HTTP_400_BAD_REQUEST)
        if not short_name:
            return Response({'detail': 'short_name is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            mixture = Mixture.objects.get(id=mixture_id)
        except Mixture.DoesNotExist:
            return Response({'detail': 'Mixture not found.'}, status=status.HTTP_404_NOT_FOUND)

        stored_filename = self._generate_stored_filename(mixture, file_type, uploaded_file.name)

        doc = ProfileDocument(
            mixture=mixture,
            file_type=file_type,
            short_name=short_name,
            file=uploaded_file,
            stored_filename=stored_filename,
        )
        doc.save()

        serializer = self.get_serializer(doc)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class SafetyDataSheetViewSet(viewsets.ModelViewSet):
    """ViewSet for managing Safety Data Sheets (SDS)."""
    queryset = SafetyDataSheet.objects.select_related('mixture', 'profile_document').all()
    serializer_class = SafetyDataSheetSerializer

    def get_serializer_class(self):
        if self.action == 'list':
            return SafetyDataSheetListSerializer
        return SafetyDataSheetSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        mixture_id = self.request.query_params.get('mixture')
        if mixture_id:
            qs = qs.filter(mixture_id=mixture_id)
        q = self.request.query_params.get('q', '').strip()
        if q:
            from django.db.models import Q
            qs = qs.filter(
                Q(product_name__icontains=q) |
                Q(cas_number__icontains=q) |
                Q(manufacturer_name__icontains=q)
            )
        return qs

    @action(detail=False, methods=['post'], url_path='import')
    def import_sds(self, request):
        """
        Import an SDS from an uploaded file or from an existing profile document.
        Parses the document and stores all data elements in structured fields.

        Accepts:
          - file: uploaded file (PDF, DOC, etc.)
          - profile_document_id: ID of an existing ProfileDocument to import from
          - mixture_id: optional profile association
          - sds_data: optional JSON with pre-parsed SDS fields (for manual/client-side parsing)
        """
        profile_doc_id = request.data.get('profile_document_id')
        mixture_id = request.data.get('mixture_id')
        uploaded_file = request.FILES.get('file')
        sds_data = request.data.get('sds_data')

        if not uploaded_file and not profile_doc_id and not sds_data:
            return Response(
                {'detail': 'Provide either a file upload, profile_document_id, or sds_data.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        mixture = None
        if mixture_id:
            try:
                mixture = Mixture.objects.get(id=mixture_id)
            except Mixture.DoesNotExist:
                return Response({'detail': 'Mixture not found.'}, status=status.HTTP_404_NOT_FOUND)

        profile_doc = None
        if profile_doc_id:
            try:
                profile_doc = ProfileDocument.objects.get(id=profile_doc_id)
                if not mixture and profile_doc.mixture:
                    mixture = profile_doc.mixture
            except ProfileDocument.DoesNotExist:
                return Response({'detail': 'Profile document not found.'}, status=status.HTTP_404_NOT_FOUND)

        original_filename = ''
        if uploaded_file:
            original_filename = uploaded_file.name
        elif profile_doc:
            original_filename = profile_doc.stored_filename

        # If sds_data is provided as JSON string, parse it
        if sds_data and isinstance(sds_data, str):
            try:
                sds_data = json.loads(sds_data)
            except json.JSONDecodeError:
                return Response({'detail': 'Invalid sds_data JSON.'}, status=status.HTTP_400_BAD_REQUEST)

        # Build the SDS record from provided data
        if sds_data and isinstance(sds_data, dict):
            sds_fields = self._extract_sds_fields(sds_data)
        else:
            # When no pre-parsed data, create a pending record
            # In production, this would trigger async document parsing (OCR/NLP)
            sds_fields = {
                'import_status': 'pending',
                'product_name': sds_data.get('product_name', original_filename) if isinstance(sds_data, dict) else original_filename,
            }

        sds = SafetyDataSheet(
            profile_document=profile_doc,
            mixture=mixture,
            original_filename=original_filename,
            **sds_fields
        )
        sds.save()

        # Auto-populate mixture components from SDS composition if linked to a mixture
        if mixture and sds_fields.get('import_status') == 'complete':
            composition = sds_fields.get('composition', '')
            if composition:
                self._populate_mixture_components(mixture, composition)

        # Auto-run characteristic hazardous determination on imported SDS
        if sds_fields.get('import_status') == 'complete':
            try:
                det_result = determine_from_sds(sds)
                sds.hazardous_determination = json.dumps(det_result)
                sds.save(update_fields=['hazardous_determination'])
            except Exception:
                pass  # Non-critical: determination can be re-run manually

        serializer = SafetyDataSheetSerializer(sds)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def _extract_sds_fields(self, data):
        """Extract and validate SDS fields from parsed data dictionary."""
        fields = {}
        # Direct string/text fields
        text_fields = [
            'product_name', 'product_code', 'recommended_use', 'restrictions_on_use',
            'manufacturer_name', 'manufacturer_address', 'manufacturer_phone',
            'emergency_phone', 'sds_version', 'signal_word', 'other_hazards',
            'first_aid_inhalation', 'first_aid_skin', 'first_aid_eye', 'first_aid_ingestion',
            'first_aid_notes', 'extinguishing_media', 'special_fire_hazards',
            'firefighter_equipment', 'personal_precautions', 'environmental_precautions',
            'containment_cleanup', 'handling_precautions', 'storage_conditions',
            'incompatible_materials', 'engineering_controls', 'respiratory_protection',
            'hand_protection', 'eye_protection', 'skin_protection',
            'physical_state', 'color', 'odor', 'odor_threshold', 'ph',
            'melting_point', 'boiling_point', 'flash_point', 'evaporation_rate',
            'flammability', 'upper_explosive_limit', 'lower_explosive_limit',
            'vapor_pressure', 'vapor_density', 'relative_density', 'solubility',
            'partition_coefficient', 'auto_ignition_temp', 'decomposition_temp',
            'viscosity', 'molecular_weight', 'molecular_formula',
            'chemical_stability', 'conditions_to_avoid', 'incompatible_materials_sec10',
            'hazardous_decomposition', 'possibility_of_reactions',
            'skin_corrosion_irritation', 'eye_damage_irritation',
            'respiratory_sensitization', 'skin_sensitization',
            'germ_cell_mutagenicity', 'carcinogenicity', 'reproductive_toxicity',
            'specific_target_organ_single', 'specific_target_organ_repeated',
            'aspiration_hazard', 'persistence_degradability',
            'bioaccumulative_potential', 'mobility_in_soil', 'other_ecological_info',
            'waste_disposal_method', 'epa_waste_code', 'contaminated_packaging',
            'un_number', 'un_proper_shipping_name', 'transport_hazard_class',
            'packing_group', 'environmental_hazard_transport',
            'special_precautions_transport', 'dot_description',
            'sara_311_312', 'sara_313', 'cercla_rq', 'rcra_waste_code',
            'tsca_status', 'california_prop65', 'state_regulations',
            'international_regulations', 'revision_notes', 'disclaimer',
            'other_information', 'cas_number', 'import_status',
        ]

        for field in text_fields:
            if field in data and data[field]:
                fields[field] = str(data[field])[:500] if field in (
                    'product_name', 'un_proper_shipping_name'
                ) else str(data[field])

        # JSON array fields
        json_fields = [
            'synonyms', 'ghs_classification', 'hazard_statements',
            'precautionary_statements', 'hazard_pictograms', 'composition',
            'exposure_limits', 'acute_toxicity', 'aquatic_toxicity',
        ]
        for field in json_fields:
            if field in data:
                val = data[field]
                if isinstance(val, (list, dict)):
                    fields[field] = json.dumps(val)
                elif isinstance(val, str):
                    # Validate it's valid JSON
                    try:
                        json.loads(val)
                        fields[field] = val
                    except json.JSONDecodeError:
                        fields[field] = json.dumps([val])

        # Date fields
        if 'sds_revision_date' in data and data['sds_revision_date']:
            fields['sds_revision_date'] = data['sds_revision_date']
        if 'preparation_date' in data and data['preparation_date']:
            fields['preparation_date'] = data['preparation_date']

        # Ensure product_name is set
        if 'product_name' not in fields:
            fields['product_name'] = 'Unknown Product'

        # Default import_status to complete when data is provided
        if 'import_status' not in fields:
            fields['import_status'] = 'complete'

        return fields

    def _populate_mixture_components(self, mixture, composition_json):
        """
        Auto-populate MixtureComponents from SDS Section 3 composition data.
        Matches chemicals by CAS number and creates components with concentration amounts.
        """
        if not mixture or not composition_json:
            return

        # Parse composition
        if isinstance(composition_json, str):
            try:
                comp_list = json.loads(composition_json)
            except (json.JSONDecodeError, TypeError):
                return
        elif isinstance(composition_json, list):
            comp_list = composition_json
        else:
            return

        for entry in comp_list:
            if not isinstance(entry, dict):
                continue

            cas = entry.get('cas_number', '').strip()
            name = entry.get('name', '').strip()
            concentration_str = entry.get('concentration', '')

            if not cas and not name:
                continue

            # Parse concentration to a numeric value (use midpoint for ranges)
            quantity = None
            unit = 'pct_weight'
            if concentration_str:
                conc_text = str(concentration_str)[:100]  # Limit input length
                range_match = re.search(
                    r'(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*%',
                    conc_text
                )
                single_match = re.search(r'[<>≤≥]?\s*(\d+(?:\.\d+)?)\s*%', conc_text)
                if range_match:
                    try:
                        low = float(range_match.group(1))
                        high = float(range_match.group(2))
                        quantity = (low + high) / 2.0
                    except ValueError:
                        pass
                elif single_match:
                    try:
                        quantity = float(single_match.group(1))
                    except ValueError:
                        pass

            # Try to find matching Chemical in database by CAS number
            chemical = None
            if cas:
                chemical = Chemical.objects.filter(cas_number=cas).first()
            if not chemical and name:
                chemical = Chemical.objects.filter(name__iexact=name).first()

            # Create or update component
            if chemical:
                comp, created = MixtureComponent.objects.get_or_create(
                    mixture=mixture,
                    chemical=chemical,
                    defaults={
                        'quantity': quantity or 0,
                        'unit': unit,
                    }
                )
                if not created and quantity and quantity > 0:
                    comp.quantity = quantity
                    comp.unit = unit
                    comp.save(update_fields=['quantity', 'unit'])
            elif name:
                # Create component with custom name if no matching chemical in DB
                comp, created = MixtureComponent.objects.get_or_create(
                    mixture=mixture,
                    custom_name=name,
                    chemical=None,
                    defaults={
                        'quantity': quantity or 0,
                        'unit': unit,
                    }
                )
                if not created and quantity and quantity > 0:
                    comp.quantity = quantity
                    comp.unit = unit
                    comp.save(update_fields=['quantity', 'unit'])

    @action(detail=True, methods=['post'], url_path='determine')
    def determine_characteristics(self, request, pk=None):
        """
        Run characteristic hazardous waste determination on an SDS record.
        Uses Section 9 (physical/chemical properties), Section 14 (transport),
        and Section 3 (composition) to evaluate against 40 CFR 261 Subpart C.
        """
        sds_record = self.get_object()

        result = determine_from_sds(sds_record)

        # Store determination on the SDS record
        sds_record.hazardous_determination = json.dumps(result)
        sds_record.save(update_fields=['hazardous_determination'])

        # If SDS is linked to a mixture, also populate additional_props for future determinations
        if sds_record.mixture:
            self._populate_mixture_components(
                sds_record.mixture,
                sds_record.composition
            )

        return Response(result)


logger = logging.getLogger(__name__)


@api_view(['GET'])
def contact_us_submissions(request):
    submissions = ContactUsSubmission.objects.all()
    serializer = ContactUsSubmissionSerializer(submissions, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
def demo_request(request):
    """Send a demo request email to sales@waste-id.com from the server."""
    data = request.data
    name = data.get('name', '')
    company = data.get('company', '')
    role = data.get('role', '')
    email = data.get('email', '')
    phone = data.get('phone', '')
    message = data.get('message', '')

    if not name or not company or not email or not phone:
        return Response(
            {'error': 'Name, company, email, and phone are required.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    subject = f'WasteID Demo Request — {company}'
    body = (
        f'Name: {name}\n'
        f'Company: {company}\n'
        f'Role: {role}\n'
        f'Email: {email}\n'
        f'Phone: {phone}\n\n'
        f'Message:\n{message}'
    )

    recipient_list = ['sales@waste-id.com']

    ContactUsSubmission.objects.create(
        name=name,
        company=company,
        role=role,
        email=email,
        phone=phone,
        message=message,
        recipient_emails=json.dumps(recipient_list),
    )

    try:
        send_mail(
            subject=subject,
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=recipient_list,
            fail_silently=False,
        )
    except Exception as e:
        logger.warning('Failed to send demo request email: %s', e)

    return Response({'status': 'ok'}, status=status.HTTP_200_OK)

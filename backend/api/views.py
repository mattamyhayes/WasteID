import json
import io
from django.http import HttpResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Chemical, Mixture, MixtureComponent, WasteDetermination, Customer, CustomerLocation, Shipper, EPAManifest, Journey
from .serializers import (ChemicalSerializer, MixtureSerializer,
                           MixtureComponentSerializer, WasteDeterminationSerializer,
                           MixtureCreateSerializer, CustomerSerializer, CustomerLocationSerializer,
                           ShipperSerializer, EPAManifestSerializer, JourneySerializer)
from .determination import determine_hazardous_waste


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

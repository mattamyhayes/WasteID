from django.core.management.base import BaseCommand
from django.utils import timezone
from api.models import Chemical


class Command(BaseCommand):
    help = 'Seed the database with EPA RCRA hazardous waste chemicals'

    def handle(self, *args, **options):
        self.stdout.write('Seeding chemicals database...')
        created = 0
        updated = 0

        # ── D-list: Toxicity Characteristic chemicals (D004–D043) ─────────────
        d_list = [
            {'name': 'Arsenic', 'cas_number': '7440-38-2', 'epa_waste_code': 'D004',
             'category': 'D_CHAR', 'is_toxic': True, 'tclp_threshold_mgl': 5.0,
             'notes': 'Toxicity characteristic – arsenic'},
            {'name': 'Barium', 'cas_number': '7440-39-3', 'epa_waste_code': 'D005',
             'category': 'D_CHAR', 'is_toxic': True, 'tclp_threshold_mgl': 100.0,
             'notes': 'Toxicity characteristic – barium'},
            {'name': 'Cadmium', 'cas_number': '7440-43-9', 'epa_waste_code': 'D006',
             'category': 'D_CHAR', 'is_toxic': True, 'tclp_threshold_mgl': 1.0,
             'notes': 'Toxicity characteristic – cadmium'},
            {'name': 'Chromium', 'cas_number': '7440-47-3', 'epa_waste_code': 'D007',
             'category': 'D_CHAR', 'is_toxic': True, 'tclp_threshold_mgl': 5.0,
             'notes': 'Toxicity characteristic – chromium'},
            {'name': 'Lead', 'cas_number': '7439-92-1', 'epa_waste_code': 'D008',
             'category': 'D_CHAR', 'is_toxic': True, 'tclp_threshold_mgl': 5.0,
             'notes': 'Toxicity characteristic – lead'},
            {'name': 'Mercury', 'cas_number': '7439-97-6', 'epa_waste_code': 'D009',
             'category': 'D_CHAR', 'is_toxic': True, 'tclp_threshold_mgl': 0.2,
             'notes': 'Toxicity characteristic – mercury'},
            {'name': 'Selenium', 'cas_number': '7782-49-2', 'epa_waste_code': 'D010',
             'category': 'D_CHAR', 'is_toxic': True, 'tclp_threshold_mgl': 1.0,
             'notes': 'Toxicity characteristic – selenium'},
            {'name': 'Silver', 'cas_number': '7440-22-4', 'epa_waste_code': 'D011',
             'category': 'D_CHAR', 'is_toxic': True, 'tclp_threshold_mgl': 5.0,
             'notes': 'Toxicity characteristic – silver'},
            {'name': 'Endrin', 'cas_number': '72-20-8', 'epa_waste_code': 'D012',
             'category': 'D_CHAR', 'is_toxic': True, 'tclp_threshold_mgl': 0.02,
             'notes': 'Toxicity characteristic – endrin (pesticide)'},
            {'name': 'Lindane (gamma-BHC)', 'cas_number': '58-89-9', 'epa_waste_code': 'D013',
             'category': 'D_CHAR', 'is_toxic': True, 'tclp_threshold_mgl': 0.4,
             'notes': 'Toxicity characteristic – lindane'},
            {'name': 'Methoxychlor', 'cas_number': '72-43-5', 'epa_waste_code': 'D014',
             'category': 'D_CHAR', 'is_toxic': True, 'tclp_threshold_mgl': 10.0,
             'notes': 'Toxicity characteristic – methoxychlor (pesticide)'},
            {'name': 'Toxaphene', 'cas_number': '8001-35-2', 'epa_waste_code': 'D015',
             'category': 'D_CHAR', 'is_toxic': True, 'tclp_threshold_mgl': 0.5,
             'notes': 'Toxicity characteristic – toxaphene (pesticide)'},
            {'name': '2,4-D (2,4-Dichlorophenoxyacetic acid)', 'cas_number': '94-75-7',
             'epa_waste_code': 'D016', 'category': 'D_CHAR', 'is_toxic': True,
             'tclp_threshold_mgl': 10.0, 'notes': 'Toxicity characteristic – 2,4-D herbicide'},
            {'name': '2,4,5-TP (Silvex)', 'cas_number': '93-72-1', 'epa_waste_code': 'D017',
             'category': 'D_CHAR', 'is_toxic': True, 'tclp_threshold_mgl': 1.0,
             'notes': 'Toxicity characteristic – silvex herbicide'},
            {'name': 'Benzene', 'cas_number': '71-43-2', 'epa_waste_code': 'D018',
             'category': 'D_CHAR', 'is_toxic': True, 'is_ignitable': True,
             'flash_point_c': -11.0, 'tclp_threshold_mgl': 0.5,
             'notes': 'Toxicity characteristic – benzene; also ignitable (flash point -11°C)'},
            {'name': 'Carbon tetrachloride', 'cas_number': '56-23-5', 'epa_waste_code': 'D019',
             'category': 'D_CHAR', 'is_toxic': True, 'tclp_threshold_mgl': 0.5,
             'notes': 'Toxicity characteristic – carbon tetrachloride'},
            {'name': 'Chlordane', 'cas_number': '57-74-9', 'epa_waste_code': 'D020',
             'category': 'D_CHAR', 'is_toxic': True, 'tclp_threshold_mgl': 0.03,
             'notes': 'Toxicity characteristic – chlordane (pesticide)'},
            {'name': 'Chlorobenzene', 'cas_number': '108-90-7', 'epa_waste_code': 'D021',
             'category': 'D_CHAR', 'is_toxic': True, 'flash_point_c': 29.0,
             'tclp_threshold_mgl': 100.0,
             'notes': 'Toxicity characteristic – chlorobenzene'},
            {'name': 'Chloroform', 'cas_number': '67-66-3', 'epa_waste_code': 'D022',
             'category': 'D_CHAR', 'is_toxic': True, 'tclp_threshold_mgl': 6.0,
             'notes': 'Toxicity characteristic – chloroform'},
            {'name': 'o-Cresol', 'cas_number': '95-48-7', 'epa_waste_code': 'D023',
             'category': 'D_CHAR', 'is_toxic': True, 'tclp_threshold_mgl': 200.0,
             'notes': 'Toxicity characteristic – o-cresol'},
            {'name': 'm-Cresol', 'cas_number': '108-39-4', 'epa_waste_code': 'D024',
             'category': 'D_CHAR', 'is_toxic': True, 'tclp_threshold_mgl': 200.0,
             'notes': 'Toxicity characteristic – m-cresol'},
            {'name': 'p-Cresol', 'cas_number': '106-44-5', 'epa_waste_code': 'D025',
             'category': 'D_CHAR', 'is_toxic': True, 'tclp_threshold_mgl': 200.0,
             'notes': 'Toxicity characteristic – p-cresol'},
            {'name': 'Cresol (mixed isomers)', 'cas_number': '', 'epa_waste_code': 'D026',
             'category': 'D_CHAR', 'is_toxic': True, 'tclp_threshold_mgl': 200.0,
             'notes': 'Toxicity characteristic – cresol (mixed isomers)'},
            {'name': '1,4-Dichlorobenzene', 'cas_number': '106-46-7', 'epa_waste_code': 'D027',
             'category': 'D_CHAR', 'is_toxic': True, 'tclp_threshold_mgl': 7.5,
             'notes': 'Toxicity characteristic – 1,4-dichlorobenzene'},
            {'name': '1,2-Dichloroethane', 'cas_number': '107-06-2', 'epa_waste_code': 'D028',
             'category': 'D_CHAR', 'is_toxic': True, 'flash_point_c': 13.0,
             'tclp_threshold_mgl': 0.5,
             'notes': 'Toxicity characteristic – 1,2-dichloroethane'},
            {'name': '1,1-Dichloroethylene', 'cas_number': '75-35-4', 'epa_waste_code': 'D029',
             'category': 'D_CHAR', 'is_toxic': True, 'flash_point_c': -28.0,
             'tclp_threshold_mgl': 0.7,
             'notes': 'Toxicity characteristic – 1,1-dichloroethylene'},
            {'name': '2,4-Dinitrotoluene', 'cas_number': '121-14-2', 'epa_waste_code': 'D030',
             'category': 'D_CHAR', 'is_toxic': True, 'tclp_threshold_mgl': 0.13,
             'notes': 'Toxicity characteristic – 2,4-dinitrotoluene'},
            {'name': 'Heptachlor (and its epoxide)', 'cas_number': '76-44-8',
             'epa_waste_code': 'D031', 'category': 'D_CHAR', 'is_toxic': True,
             'tclp_threshold_mgl': 0.008, 'notes': 'Toxicity characteristic – heptachlor'},
            {'name': 'Hexachlorobenzene', 'cas_number': '118-74-1', 'epa_waste_code': 'D032',
             'category': 'D_CHAR', 'is_toxic': True, 'tclp_threshold_mgl': 0.13,
             'notes': 'Toxicity characteristic – hexachlorobenzene'},
            {'name': 'Hexachlorobutadiene', 'cas_number': '87-68-3', 'epa_waste_code': 'D033',
             'category': 'D_CHAR', 'is_toxic': True, 'tclp_threshold_mgl': 0.5,
             'notes': 'Toxicity characteristic – hexachlorobutadiene'},
            {'name': 'Hexachloroethane', 'cas_number': '67-72-1', 'epa_waste_code': 'D034',
             'category': 'D_CHAR', 'is_toxic': True, 'tclp_threshold_mgl': 3.0,
             'notes': 'Toxicity characteristic – hexachloroethane'},
            {'name': 'Methyl ethyl ketone (2-Butanone)', 'cas_number': '78-93-3',
             'epa_waste_code': 'D035', 'category': 'D_CHAR', 'is_toxic': True,
             'is_ignitable': True, 'flash_point_c': -9.0, 'tclp_threshold_mgl': 200.0,
             'notes': 'Toxicity characteristic – MEK; also ignitable'},
            {'name': 'Nitrobenzene', 'cas_number': '98-95-3', 'epa_waste_code': 'D036',
             'category': 'D_CHAR', 'is_toxic': True, 'flash_point_c': 88.0,
             'tclp_threshold_mgl': 2.0,
             'notes': 'Toxicity characteristic – nitrobenzene'},
            {'name': 'Pentachlorophenol', 'cas_number': '87-86-5', 'epa_waste_code': 'D037',
             'category': 'D_CHAR', 'is_toxic': True, 'tclp_threshold_mgl': 100.0,
             'notes': 'Toxicity characteristic – pentachlorophenol'},
            {'name': 'Pyridine', 'cas_number': '110-86-1', 'epa_waste_code': 'D038',
             'category': 'D_CHAR', 'is_toxic': True, 'flash_point_c': 17.0,
             'tclp_threshold_mgl': 5.0,
             'notes': 'Toxicity characteristic – pyridine; also ignitable'},
            {'name': 'Tetrachloroethylene (Perchloroethylene)', 'cas_number': '127-18-4',
             'epa_waste_code': 'D039', 'category': 'D_CHAR', 'is_toxic': True,
             'tclp_threshold_mgl': 0.7,
             'notes': 'Toxicity characteristic – tetrachloroethylene (PCE)'},
            {'name': 'Trichloroethylene', 'cas_number': '79-01-6', 'epa_waste_code': 'D040',
             'category': 'D_CHAR', 'is_toxic': True, 'tclp_threshold_mgl': 0.5,
             'notes': 'Toxicity characteristic – trichloroethylene (TCE)'},
            {'name': '2,4,5-Trichlorophenol', 'cas_number': '95-95-4', 'epa_waste_code': 'D041',
             'category': 'D_CHAR', 'is_toxic': True, 'tclp_threshold_mgl': 400.0,
             'notes': 'Toxicity characteristic – 2,4,5-trichlorophenol'},
            {'name': '2,4,6-Trichlorophenol', 'cas_number': '88-06-2', 'epa_waste_code': 'D042',
             'category': 'D_CHAR', 'is_toxic': True, 'tclp_threshold_mgl': 2.0,
             'notes': 'Toxicity characteristic – 2,4,6-trichlorophenol'},
            {'name': 'Vinyl chloride', 'cas_number': '75-01-4', 'epa_waste_code': 'D043',
             'category': 'D_CHAR', 'is_toxic': True, 'flash_point_c': -78.0,
             'tclp_threshold_mgl': 0.2,
             'notes': 'Toxicity characteristic – vinyl chloride; also ignitable'},
        ]

        # ── P-list: Acutely Hazardous Wastes ──────────────────────────────────
        p_list = [
            {'name': 'Warfarin (>0.3%)', 'cas_number': '81-81-2', 'epa_waste_code': 'P001',
             'category': 'P', 'is_acutely_hazardous': True, 'is_toxic': True,
             'notes': 'P001 – acutely hazardous anticoagulant rodenticide'},
            {'name': 'Zinc phosphide (>10%)', 'cas_number': '1314-84-7', 'epa_waste_code': 'P122',
             'category': 'P', 'is_acutely_hazardous': True, 'is_reactive': True,
             'notes': 'P122 – zinc phosphide rodenticide'},
            {'name': 'TEPP (Tetraethyl pyrophosphate)', 'cas_number': '107-49-3',
             'epa_waste_code': 'P111', 'category': 'P', 'is_acutely_hazardous': True,
             'is_toxic': True, 'notes': 'P111 – organophosphate insecticide'},
            {'name': 'Methyl parathion', 'cas_number': '298-00-0', 'epa_waste_code': 'P071',
             'category': 'P', 'is_acutely_hazardous': True, 'is_toxic': True,
             'notes': 'P071 – organophosphate pesticide'},
            {'name': 'Parathion', 'cas_number': '56-38-2', 'epa_waste_code': 'P089',
             'category': 'P', 'is_acutely_hazardous': True, 'is_toxic': True,
             'notes': 'P089 – organophosphate insecticide'},
            {'name': 'Acrolein', 'cas_number': '107-02-8', 'epa_waste_code': 'P003',
             'category': 'P', 'is_acutely_hazardous': True, 'is_toxic': True,
             'is_ignitable': True, 'flash_point_c': -26.0,
             'notes': 'P003 – acrolein; reactive, ignitable, acutely toxic'},
            {'name': 'Aldicarb', 'cas_number': '116-06-3', 'epa_waste_code': 'P004',
             'category': 'P', 'is_acutely_hazardous': True, 'is_toxic': True,
             'notes': 'P004 – aldicarb; carbamate pesticide (2-methyl-2-(methylthio)propionaldehyde O-(methylcarbamoyl)oxime)'},
            {'name': 'Aldicarb sulfoxide', 'cas_number': '1646-87-3', 'epa_waste_code': 'P070',
             'category': 'P', 'is_acutely_hazardous': True, 'is_toxic': True,
             'notes': 'P070 – aldicarb sulfoxide; carbamate pesticide metabolite'},
            {'name': 'Aldrin', 'cas_number': '309-00-2', 'epa_waste_code': '',
             'category': 'OTHER', 'is_toxic': True,
             'notes': 'Aldrin – chlorinated pesticide; hazardous constituent per 40 CFR 261 Appendix VIII; no standalone P/U waste code'},
            {'name': 'Allyl alcohol', 'cas_number': '107-18-6', 'epa_waste_code': 'P005',
             'category': 'P', 'is_acutely_hazardous': True, 'is_toxic': True,
             'is_ignitable': True, 'flash_point_c': 22.0,
             'notes': 'P005 – allyl alcohol'},
            {'name': 'Aluminum phosphide', 'cas_number': '20859-73-8', 'epa_waste_code': 'P006',
             'category': 'P', 'is_acutely_hazardous': True, 'is_reactive': True,
             'notes': 'P006 – aluminum phosphide; water-reactive'},
            {'name': 'Arsenic acid', 'cas_number': '7778-39-4', 'epa_waste_code': 'P010',
             'category': 'P', 'is_acutely_hazardous': True, 'is_toxic': True,
             'is_corrosive': True,
             'notes': 'P010 – arsenic acid'},
            {'name': 'Arsenic trioxide', 'cas_number': '1327-53-3', 'epa_waste_code': 'P012',
             'category': 'P', 'is_acutely_hazardous': True, 'is_toxic': True,
             'notes': 'P012 – arsenic trioxide'},
            {'name': 'Barium cyanide', 'cas_number': '542-62-1', 'epa_waste_code': 'P013',
             'category': 'P', 'is_acutely_hazardous': True, 'is_toxic': True,
             'notes': 'P013 – barium cyanide'},
            {'name': 'Calcium cyanide', 'cas_number': '592-01-8', 'epa_waste_code': 'P021',
             'category': 'P', 'is_acutely_hazardous': True, 'is_toxic': True,
             'notes': 'P021 – calcium cyanide'},
            {'name': 'Carbon disulfide', 'cas_number': '75-15-0', 'epa_waste_code': 'P022',
             'category': 'P', 'is_acutely_hazardous': True, 'is_ignitable': True,
             'flash_point_c': -30.0,
             'notes': 'P022 – carbon disulfide; extremely flammable'},
            {'name': 'Chlorine', 'cas_number': '7782-50-5', 'epa_waste_code': 'P023',
             'category': 'P', 'is_acutely_hazardous': True, 'is_toxic': True,
             'is_reactive': True,
             'notes': 'P023 – chlorine gas; reactive, acutely toxic'},
            {'name': 'Copper cyanide', 'cas_number': '544-92-3', 'epa_waste_code': 'P029',
             'category': 'P', 'is_acutely_hazardous': True, 'is_toxic': True,
             'notes': 'P029 – copper cyanide'},
            {'name': 'Cyanogen', 'cas_number': '460-19-5', 'epa_waste_code': 'P031',
             'category': 'P', 'is_acutely_hazardous': True, 'is_toxic': True,
             'is_ignitable': True, 'flash_point_c': -17.8,
             'notes': 'P031 – cyanogen; ignitable, acutely toxic'},
            {'name': 'Cyanogen chloride', 'cas_number': '506-77-4', 'epa_waste_code': 'P033',
             'category': 'P', 'is_acutely_hazardous': True, 'is_toxic': True,
             'notes': 'P033 – cyanogen chloride; chemical warfare agent precursor'},
            {'name': 'Diazomethane', 'cas_number': '334-88-3', 'epa_waste_code': 'P036',
             'category': 'P', 'is_acutely_hazardous': True, 'is_reactive': True,
             'is_ignitable': True, 'flash_point_c': -45.0,
             'notes': 'P036 – diazomethane; explosive, highly toxic'},
            {'name': 'Dieldrin', 'cas_number': '60-57-1', 'epa_waste_code': 'P037',
             'category': 'P', 'is_acutely_hazardous': True, 'is_toxic': True,
             'notes': 'P037 – dieldrin organochlorine pesticide'},
            {'name': 'Fluorine', 'cas_number': '7782-41-4', 'epa_waste_code': 'P056',
             'category': 'P', 'is_acutely_hazardous': True, 'is_reactive': True,
             'is_corrosive': True,
             'notes': 'P056 – fluorine gas; extremely reactive'},
            {'name': 'Hydrocyanic acid', 'cas_number': '74-90-8', 'epa_waste_code': 'P063',
             'category': 'P', 'is_acutely_hazardous': True, 'is_toxic': True,
             'is_ignitable': True, 'flash_point_c': -17.8,
             'notes': 'P063 – hydrogen cyanide; extremely toxic'},
            {'name': 'Hydrogen fluoride (>37%)', 'cas_number': '7664-39-3',
             'epa_waste_code': 'P056', 'category': 'P', 'is_acutely_hazardous': True,
             'is_corrosive': True, 'ph_value': 1.0,
             'notes': 'P056 – hydrofluoric acid; extremely corrosive and toxic'},
            {'name': 'Hydrogen sulfide', 'cas_number': '7783-06-4', 'epa_waste_code': 'P049',
             'category': 'P', 'is_acutely_hazardous': True, 'is_toxic': True,
             'is_ignitable': True, 'flash_point_c': -82.0,
             'notes': 'P049 – hydrogen sulfide; ignitable, extremely toxic'},
            {'name': 'Mercury fulminate', 'cas_number': '628-86-4', 'epa_waste_code': 'P065',
             'category': 'P', 'is_acutely_hazardous': True, 'is_reactive': True,
             'notes': 'P065 – mercury fulminate; detonation hazard'},
            {'name': 'Methyl hydrazine', 'cas_number': '60-34-4', 'epa_waste_code': 'P068',
             'category': 'P', 'is_acutely_hazardous': True, 'is_ignitable': True,
             'flash_point_c': -8.0, 'is_toxic': True,
             'notes': 'P068 – methyl hydrazine; carcinogen, ignitable'},
            {'name': 'Nickel carbonyl', 'cas_number': '13463-39-3', 'epa_waste_code': 'P073',
             'category': 'P', 'is_acutely_hazardous': True, 'is_toxic': True,
             'is_ignitable': True, 'flash_point_c': -21.0,
             'notes': 'P073 – nickel carbonyl; extremely toxic, carcinogenic'},
            {'name': 'Osmium tetroxide', 'cas_number': '20816-12-0', 'epa_waste_code': 'P087',
             'category': 'P', 'is_acutely_hazardous': True, 'is_toxic': True,
             'notes': 'P087 – osmium tetroxide; extremely toxic oxidizer'},
            {'name': 'Potassium cyanide', 'cas_number': '151-50-8', 'epa_waste_code': 'P098',
             'category': 'P', 'is_acutely_hazardous': True, 'is_toxic': True,
             'notes': 'P098 – potassium cyanide'},
            {'name': 'Sodium azide', 'cas_number': '26628-22-8', 'epa_waste_code': 'P105',
             'category': 'P', 'is_acutely_hazardous': True, 'is_reactive': True,
             'is_toxic': True,
             'notes': 'P105 – sodium azide; explosive, highly toxic'},
            {'name': 'Sodium cyanide', 'cas_number': '143-33-9', 'epa_waste_code': 'P106',
             'category': 'P', 'is_acutely_hazardous': True, 'is_toxic': True,
             'notes': 'P106 – sodium cyanide'},
            {'name': 'Strychnine', 'cas_number': '57-24-9', 'epa_waste_code': 'P108',
             'category': 'P', 'is_acutely_hazardous': True, 'is_toxic': True,
             'notes': 'P108 – strychnine and its salts'},
            {'name': 'Thallium(I) sulfate', 'cas_number': '7446-18-6', 'epa_waste_code': 'P115',
             'category': 'P', 'is_acutely_hazardous': True, 'is_toxic': True,
             'notes': 'P115 – thallium sulfate'},
        ]

        # ── U-list: Toxic Wastes ───────────────────────────────────────────────
        u_list = [
            {'name': 'Acetaldehyde', 'cas_number': '75-07-0', 'epa_waste_code': 'U001',
             'category': 'U', 'is_toxic': True, 'is_ignitable': True, 'flash_point_c': -38.0,
             'notes': 'U001 – acetaldehyde; ignitable, toxic'},
            {'name': 'Acetone', 'cas_number': '67-64-1', 'epa_waste_code': 'U002',
             'category': 'U', 'is_toxic': True, 'is_ignitable': True, 'flash_point_c': -20.0,
             'notes': 'U002 – acetone (F003 solvent); ignitable'},
            {'name': 'Acetonitrile', 'cas_number': '75-05-8', 'epa_waste_code': 'U003',
             'category': 'U', 'is_toxic': True, 'is_ignitable': True, 'flash_point_c': 2.0,
             'notes': 'U003 – acetonitrile; ignitable, toxic'},
            {'name': 'Acetophenone', 'cas_number': '98-86-2', 'epa_waste_code': 'U004',
             'category': 'U', 'is_toxic': True,
             'notes': 'U004 – acetophenone'},
            {'name': '2-Acetylaminofluorene (2-AAF)', 'cas_number': '53-96-3',
             'epa_waste_code': 'U005', 'category': 'U', 'is_toxic': True,
             'notes': 'U005 – 2-acetylaminofluorene; carcinogen'},
            {'name': 'Acrylamide', 'cas_number': '79-06-1', 'epa_waste_code': 'U007',
             'category': 'U', 'is_toxic': True,
             'notes': 'U007 – acrylamide; neurotoxin, carcinogen'},
            {'name': 'Acrylic acid', 'cas_number': '79-10-7', 'epa_waste_code': 'U008',
             'category': 'U', 'is_toxic': True, 'is_ignitable': True, 'flash_point_c': 50.0,
             'notes': 'U008 – acrylic acid; corrosive'},
            {'name': 'Acrylonitrile', 'cas_number': '107-13-1', 'epa_waste_code': 'U009',
             'category': 'U', 'is_toxic': True, 'is_ignitable': True, 'flash_point_c': 0.0,
             'notes': 'U009 – acrylonitrile; carcinogen, ignitable'},
            {'name': 'Aniline', 'cas_number': '62-53-3', 'epa_waste_code': 'U012',
             'category': 'U', 'is_toxic': True, 'flash_point_c': 70.0,
             'notes': 'U012 – aniline; toxic, potential carcinogen'},
            {'name': 'Benzene', 'cas_number': '71-43-2', 'epa_waste_code': 'U019',
             'category': 'U', 'is_toxic': True, 'is_ignitable': True, 'flash_point_c': -11.0,
             'notes': 'U019 – benzene; carcinogen, D018 overlap'},
            {'name': 'Benzal chloride', 'cas_number': '98-87-3', 'epa_waste_code': 'U017',
             'category': 'U', 'is_toxic': True,
             'notes': 'U017 – benzal chloride'},
            {'name': 'Carbon tetrachloride', 'cas_number': '56-23-5', 'epa_waste_code': 'U211',
             'category': 'U', 'is_toxic': True,
             'notes': 'U211 – carbon tetrachloride'},
            {'name': 'Chloroform', 'cas_number': '67-66-3', 'epa_waste_code': 'U044',
             'category': 'U', 'is_toxic': True,
             'notes': 'U044 – chloroform; potential carcinogen'},
            {'name': 'Cyclohexanone', 'cas_number': '108-94-1', 'epa_waste_code': 'U057',
             'category': 'U', 'is_toxic': True, 'flash_point_c': 44.0,
             'notes': 'U057 – cyclohexanone (F003 solvent)'},
            {'name': 'Dichloromethane (Methylene chloride)', 'cas_number': '75-09-2',
             'epa_waste_code': 'U080', 'category': 'U', 'is_toxic': True,
             'notes': 'U080 – methylene chloride; carcinogen'},
            {'name': 'Diethyl ether', 'cas_number': '60-29-7', 'epa_waste_code': 'U117',
             'category': 'U', 'is_toxic': True, 'is_ignitable': True, 'flash_point_c': -45.0,
             'notes': 'U117 – diethyl ether (ethyl ether); extremely flammable'},
            {'name': 'Dimethylformamide', 'cas_number': '68-12-2', 'epa_waste_code': 'U056',
             'category': 'U', 'is_toxic': True, 'flash_point_c': 57.0,
             'notes': 'U056 – DMF; reproductive toxin'},
            {'name': 'Ethyl acetate', 'cas_number': '141-78-6', 'epa_waste_code': 'U112',
             'category': 'U', 'is_toxic': True, 'is_ignitable': True, 'flash_point_c': -4.0,
             'notes': 'U112 – ethyl acetate (F003 solvent); ignitable'},
            {'name': 'Ethylbenzene', 'cas_number': '100-41-4', 'epa_waste_code': 'U239',
             'category': 'U', 'is_toxic': True, 'is_ignitable': True, 'flash_point_c': 15.0,
             'notes': 'U239 – ethylbenzene (F003 solvent)'},
            {'name': 'Formaldehyde', 'cas_number': '50-00-0', 'epa_waste_code': 'U122',
             'category': 'U', 'is_toxic': True, 'is_ignitable': True, 'flash_point_c': 64.0,
             'notes': 'U122 – formaldehyde; carcinogen'},
            {'name': 'Methanol', 'cas_number': '67-56-1', 'epa_waste_code': 'U154',
             'category': 'U', 'is_toxic': True, 'is_ignitable': True, 'flash_point_c': 11.0,
             'notes': 'U154 – methanol (F003 solvent); ignitable, toxic'},
            {'name': 'Methyl isobutyl ketone (MIBK)', 'cas_number': '108-10-1',
             'epa_waste_code': 'U161', 'category': 'U', 'is_toxic': True,
             'is_ignitable': True, 'flash_point_c': 14.0,
             'notes': 'U161 – MIBK (F003 solvent); ignitable'},
            {'name': 'Naphthalene', 'cas_number': '91-20-3', 'epa_waste_code': 'U165',
             'category': 'U', 'is_toxic': True, 'flash_point_c': 79.0,
             'notes': 'U165 – naphthalene; possible carcinogen'},
            {'name': 'Nitrobenzene', 'cas_number': '98-95-3', 'epa_waste_code': 'U169',
             'category': 'U', 'is_toxic': True,
             'notes': 'U169 – nitrobenzene; D036 overlap'},
            {'name': 'n-Butyl alcohol (1-Butanol)', 'cas_number': '71-36-3',
             'epa_waste_code': 'U031', 'category': 'U', 'is_toxic': True,
             'is_ignitable': True, 'flash_point_c': 29.0,
             'notes': 'U031 – 1-butanol (F003 solvent); ignitable'},
            {'name': 'Phenol', 'cas_number': '108-95-2', 'epa_waste_code': 'U188',
             'category': 'U', 'is_toxic': True, 'flash_point_c': 79.0,
             'notes': 'U188 – phenol; corrosive, toxic'},
            {'name': 'Pyridine', 'cas_number': '110-86-1', 'epa_waste_code': 'U196',
             'category': 'U', 'is_toxic': True, 'is_ignitable': True, 'flash_point_c': 17.0,
             'notes': 'U196 – pyridine (F005 solvent); D038 overlap'},
            {'name': 'Styrene', 'cas_number': '100-42-5', 'epa_waste_code': 'U239',
             'category': 'U', 'is_toxic': True, 'is_ignitable': True, 'flash_point_c': 31.0,
             'notes': 'U239 – styrene'},
            {'name': 'Tetrachloroethylene', 'cas_number': '127-18-4', 'epa_waste_code': 'U210',
             'category': 'U', 'is_toxic': True,
             'notes': 'U210 – tetrachloroethylene (PCE); D039 overlap'},
            {'name': 'Toluene', 'cas_number': '108-88-3', 'epa_waste_code': 'U220',
             'category': 'U', 'is_toxic': True, 'is_ignitable': True, 'flash_point_c': 4.0,
             'notes': 'U220 – toluene (F005 solvent); ignitable'},
            {'name': 'Trichloroethylene', 'cas_number': '79-01-6', 'epa_waste_code': 'U228',
             'category': 'U', 'is_toxic': True,
             'notes': 'U228 – trichloroethylene (TCE); D040 overlap, carcinogen'},
            {'name': 'Xylene (mixed isomers)', 'cas_number': '1330-20-7',
             'epa_waste_code': 'U239', 'category': 'U', 'is_toxic': True,
             'is_ignitable': True, 'flash_point_c': 25.0,
             'notes': 'U239 – xylene (F003 solvent); ignitable'},
        ]

        # ── Common chemicals with ignitability / corrosivity / reactivity ─────
        other_chemicals = [
            # Ignitable solvents / fuels
            {'name': 'Ethanol (Ethyl alcohol)', 'cas_number': '64-17-5', 'epa_waste_code': '',
             'category': 'OTHER', 'is_ignitable': True, 'flash_point_c': 13.0,
             'notes': 'Common ignitable solvent; flash point 13°C'},
            {'name': 'Isopropyl alcohol (IPA)', 'cas_number': '67-63-0', 'epa_waste_code': '',
             'category': 'OTHER', 'is_ignitable': True, 'flash_point_c': 12.0,
             'notes': 'Common ignitable solvent; flash point 12°C'},
            {'name': 'Hexane', 'cas_number': '110-54-3', 'epa_waste_code': '',
             'category': 'OTHER', 'is_ignitable': True, 'flash_point_c': -22.0,
             'notes': 'Extremely flammable solvent; flash point -22°C'},
            {'name': 'Heptane', 'cas_number': '142-82-5', 'epa_waste_code': '',
             'category': 'OTHER', 'is_ignitable': True, 'flash_point_c': -4.0,
             'notes': 'Flammable solvent; flash point -4°C'},
            {'name': 'Gasoline', 'cas_number': '86290-81-5', 'epa_waste_code': '',
             'category': 'OTHER', 'is_ignitable': True, 'flash_point_c': -43.0,
             'notes': 'Flammable petroleum product; flash point -43°C'},
            {'name': 'Diesel fuel', 'cas_number': '68334-30-5', 'epa_waste_code': '',
             'category': 'OTHER', 'is_ignitable': True, 'flash_point_c': 52.0,
             'notes': 'Combustible petroleum product; flash point ~52°C'},
            {'name': 'Methyl tert-butyl ether (MTBE)', 'cas_number': '1634-04-4',
             'epa_waste_code': '', 'category': 'OTHER', 'is_ignitable': True,
             'flash_point_c': -28.0,
             'notes': 'Fuel oxygenate; ignitable, groundwater contaminant'},
            {'name': 'Diethyl ether', 'cas_number': '60-29-7', 'epa_waste_code': '',
             'category': 'OTHER', 'is_ignitable': True, 'flash_point_c': -45.0,
             'notes': 'Extremely flammable solvent/anesthetic; flash point -45°C'},
            # Corrosive acids
            {'name': 'Sulfuric acid (concentrated)', 'cas_number': '7664-93-9',
             'epa_waste_code': '', 'category': 'OTHER', 'is_corrosive': True,
             'ph_value': 0.3,
             'notes': 'Strong mineral acid; highly corrosive, pH ~0.3'},
            {'name': 'Hydrochloric acid (concentrated)', 'cas_number': '7647-01-0',
             'epa_waste_code': '', 'category': 'OTHER', 'is_corrosive': True,
             'ph_value': 0.1,
             'notes': 'Strong mineral acid; highly corrosive, pH ~0.1'},
            {'name': 'Nitric acid (concentrated)', 'cas_number': '7697-37-2',
             'epa_waste_code': '', 'category': 'OTHER', 'is_corrosive': True,
             'is_reactive': True, 'ph_value': 1.0,
             'notes': 'Strong oxidizing acid; corrosive and reactive'},
            {'name': 'Phosphoric acid', 'cas_number': '7664-38-2', 'epa_waste_code': '',
             'category': 'OTHER', 'is_corrosive': True, 'ph_value': 1.5,
             'notes': 'Mineral acid; corrosive at high concentrations'},
            {'name': 'Acetic acid (glacial)', 'cas_number': '64-19-7', 'epa_waste_code': '',
             'category': 'OTHER', 'is_corrosive': True, 'is_ignitable': True,
             'flash_point_c': 39.0, 'ph_value': 2.4,
             'notes': 'Weak acid; corrosive and ignitable at high concentrations'},
            {'name': 'Hydrofluoric acid', 'cas_number': '7664-39-3', 'epa_waste_code': '',
             'category': 'OTHER', 'is_corrosive': True, 'is_toxic': True,
             'ph_value': 1.2,
             'notes': 'Highly corrosive and toxic; etches glass'},
            # Corrosive bases
            {'name': 'Sodium hydroxide (caustic soda)', 'cas_number': '1310-73-2',
             'epa_waste_code': '', 'category': 'OTHER', 'is_corrosive': True,
             'ph_value': 14.0,
             'notes': 'Strong base; highly corrosive, pH ~14'},
            {'name': 'Potassium hydroxide', 'cas_number': '1310-58-3', 'epa_waste_code': '',
             'category': 'OTHER', 'is_corrosive': True, 'ph_value': 14.0,
             'notes': 'Strong base; highly corrosive'},
            {'name': 'Ammonium hydroxide (concentrated)', 'cas_number': '1336-21-6',
             'epa_waste_code': '', 'category': 'OTHER', 'is_corrosive': True,
             'ph_value': 13.0,
             'notes': 'Aqueous ammonia; corrosive, toxic vapors'},
            {'name': 'Calcium hydroxide (slaked lime)', 'cas_number': '1305-62-0',
             'epa_waste_code': '', 'category': 'OTHER', 'is_corrosive': True,
             'ph_value': 12.4,
             'notes': 'Slightly soluble base; corrosive at threshold pH'},
            # Reactive chemicals
            {'name': 'Sodium metal', 'cas_number': '7440-23-5', 'epa_waste_code': '',
             'category': 'OTHER', 'is_reactive': True,
             'notes': 'Alkali metal; violently water-reactive, fire hazard'},
            {'name': 'Potassium metal', 'cas_number': '7440-09-7', 'epa_waste_code': '',
             'category': 'OTHER', 'is_reactive': True,
             'notes': 'Alkali metal; violently water-reactive'},
            {'name': 'Lithium aluminum hydride', 'cas_number': '16853-85-3',
             'epa_waste_code': '', 'category': 'OTHER', 'is_reactive': True,
             'notes': 'Reducing agent; water-reactive, fire hazard'},
            {'name': 'Hydrogen peroxide (>52%)', 'cas_number': '7722-84-1',
             'epa_waste_code': '', 'category': 'OTHER', 'is_reactive': True,
             'is_corrosive': True, 'ph_value': 4.5,
             'notes': 'Strong oxidizer; reactive, corrosive at high concentrations'},
            {'name': 'Perchlorates (mixed)', 'cas_number': '14797-73-0', 'epa_waste_code': '',
             'category': 'OTHER', 'is_reactive': True,
             'notes': 'Oxidizing salts; reactive, fire accelerant'},
            # Common non-hazardous materials
            {'name': 'Water (H2O)', 'cas_number': '7732-18-5', 'epa_waste_code': '',
            'category': 'OTHER', 'ph_value': 7.0, 'source': 'manual',
            'notes': 'Water – common solvent / diluent'},
            {'name': 'Inert Solid', 'cas_number': '', 'epa_waste_code': '',
            'category': 'OTHER', 'source': 'manual',
            'notes': 'Inert solid material – non-hazardous'},
            {'name': 'Inert Liquid', 'cas_number': '', 'epa_waste_code': '',
            'category': 'OTHER', 'source': 'manual',
            'notes': 'Inert liquid material – non-hazardous'},
        ]

        # ── 40 CFR 261 Subpart D import (F-list & K-list) ─────────────────────
        # Source: https://www.ecfr.gov/current/title-40/chapter-I/subchapter-I/
        #         part-261/subpart-D
        #
        # The F-list (§261.31, non-specific sources) and K-list (§261.32,
        # specific sources) describe hazardous *waste streams* rather than single
        # substances. They therefore have no CAS number; the regulatory
        # "Hazardous waste" column is captured in `hazardous_waste_description`.
        #
        # Hazard codes (§261.30(b)) are mapped onto the existing characteristic
        # boolean fields so the new data stays consistent with what is already in
        # the database:
        #   (I) Ignitable Waste            -> is_ignitable
        #   (C) Corrosive Waste            -> is_corrosive
        #   (R) Reactive Waste             -> is_reactive
        #   (E) Toxicity Characteristic    -> is_toxic
        #   (T) Toxic Waste                -> is_toxic
        #   (H) Acute Hazardous Waste      -> is_acutely_hazardous
        HAZARD_CODE_FLAGS = {
            'I': 'is_ignitable',
            'C': 'is_corrosive',
            'R': 'is_reactive',
            'E': 'is_toxic',
            'T': 'is_toxic',
            'H': 'is_acutely_hazardous',
        }
        IMPORT_SOURCE_REF = '40 CFR 261 Subpart D (eCFR)'
        IMPORT_ADDED_BY = 'eCFR Import (40 CFR 261 Subpart D)'

        def build_listed(code, name, category, hazard_codes, description):
            """Build a Chemical dict for an F-/K-list waste stream."""
            section = '261.31' if category == 'F' else '261.32'
            codes_str = ', '.join('(%s)' % h for h in hazard_codes)
            item = {
                'name': name,
                'cas_number': '',
                'epa_waste_code': code,
                'category': category,
                'hazardous_waste_description': description,
                'source': 'epa_import',
                'added_by': IMPORT_ADDED_BY,
                'notes': (
                    f'{code} – {IMPORT_SOURCE_REF} §{section}; '
                    f'hazard code(s): {codes_str or "—"}'
                ),
            }
            for h in hazard_codes:
                item[HAZARD_CODE_FLAGS[h]] = True
            return item

        # ── F-list: Hazardous wastes from non-specific sources (§261.31) ──────
        f_list_raw = [
            ('F001', 'Spent halogenated solvents used in degreasing', ['T'],
             'The following spent halogenated solvents used in degreasing: '
             'Tetrachloroethylene, trichloroethylene, methylene chloride, '
             '1,1,1-trichloroethane, carbon tetrachloride, and chlorinated '
             'fluorocarbons; all spent solvent mixtures/blends used in degreasing '
             'containing, before use, a total of ten percent or more (by volume) '
             'of one or more of the above halogenated solvents or those solvents '
             'listed in F002, F004, and F005; and still bottoms from the recovery '
             'of these spent solvents and spent solvent mixtures.'),
            ('F002', 'Spent halogenated solvents', ['T'],
             'The following spent halogenated solvents: Tetrachloroethylene, '
             'methylene chloride, trichloroethylene, 1,1,1-trichloroethane, '
             'chlorobenzene, 1,1,2-trichloro-1,2,2-trifluoroethane, '
             'ortho-dichlorobenzene, trichlorofluoromethane, and '
             '1,1,2-trichloroethane; all spent solvent mixtures/blends containing, '
             'before use, a total of ten percent or more (by volume) of one or '
             'more of the above halogenated solvents or those listed in F001, '
             'F004, or F005; and still bottoms from the recovery of these spent '
             'solvents and spent solvent mixtures.'),
            ('F003', 'Spent non-halogenated solvents (xylene, acetone, etc.)', ['I'],
             'The following spent non-halogenated solvents: Xylene, acetone, ethyl '
             'acetate, ethyl benzene, ethyl ether, methyl isobutyl ketone, '
             'n-butyl alcohol, cyclohexanone, and methanol; all spent solvent '
             'mixtures/blends containing, before use, only the above spent '
             'non-halogenated solvents; and all spent solvent mixtures/blends '
             'containing, before use, one or more of the above non-halogenated '
             'solvents, and a total of ten percent or more (by volume) of one or '
             'more of those solvents listed in F001, F002, F004, and F005; and '
             'still bottoms from the recovery of these spent solvents and spent '
             'solvent mixtures.'),
            ('F004', 'Spent non-halogenated solvents (cresols, nitrobenzene)', ['T'],
             'The following spent non-halogenated solvents: Cresols and cresylic '
             'acid, and nitrobenzene; all spent solvent mixtures/blends containing, '
             'before use, a total of ten percent or more (by volume) of one or '
             'more of the above non-halogenated solvents or those solvents listed '
             'in F001, F002, and F005; and still bottoms from the recovery of '
             'these spent solvents and spent solvent mixtures.'),
            ('F005', 'Spent non-halogenated solvents (toluene, MEK, etc.)', ['I', 'T'],
             'The following spent non-halogenated solvents: Toluene, methyl ethyl '
             'ketone, carbon disulfide, isobutanol, pyridine, benzene, '
             '2-ethoxyethanol, and 2-nitropropane; all spent solvent mixtures/'
             'blends containing, before use, a total of ten percent or more (by '
             'volume) of one or more of the above non-halogenated solvents or '
             'those solvents listed in F001, F002, or F004; and still bottoms from '
             'the recovery of these spent solvents and spent solvent mixtures.'),
            ('F006', 'Wastewater treatment sludges from electroplating', ['T'],
             'Wastewater treatment sludges from electroplating operations except '
             'from the following processes: (1) Sulfuric acid anodizing of '
             'aluminum; (2) tin plating on carbon steel; (3) zinc plating '
             '(segregated basis) on carbon steel; (4) aluminum or zinc-aluminum '
             'plating on carbon steel; (5) cleaning/stripping associated with tin, '
             'zinc and aluminum plating on carbon steel; and (6) chemical etching '
             'and milling of aluminum.'),
            ('F007', 'Spent cyanide plating bath solutions', ['R', 'T'],
             'Spent cyanide plating bath solutions from electroplating operations.'),
            ('F008', 'Plating bath residues (cyanide electroplating)', ['R', 'T'],
             'Plating bath residues from the bottom of plating baths from '
             'electroplating operations where cyanides are used in the process.'),
            ('F009', 'Spent stripping and cleaning bath solutions (cyanide)', ['R', 'T'],
             'Spent stripping and cleaning bath solutions from electroplating '
             'operations where cyanides are used in the process.'),
            ('F010', 'Quenching bath residues from oil baths (cyanide)', ['R', 'T'],
             'Quenching bath residues from oil baths from metal heat treating '
             'operations where cyanides are used in the process.'),
            ('F011', 'Spent cyanide solutions from salt bath pot cleaning', ['R', 'T'],
             'Spent cyanide solutions from salt bath pot cleaning from metal heat '
             'treating operations.'),
            ('F012', 'Quenching wastewater treatment sludges (cyanide)', ['T'],
             'Quenching wastewater treatment sludges from metal heat treating '
             'operations where cyanides are used in the process.'),
            ('F019', 'Wastewater treatment sludges from conversion coating of aluminum', ['T'],
             'Wastewater treatment sludges from the chemical conversion coating of '
             'aluminum except from zirconium phosphating in aluminum can washing '
             'when such phosphating is an exclusive conversion coating process. '
             'Wastewater treatment sludges from the manufacturing of motor '
             'vehicles using a zinc phosphating process will not be subject to '
             'this listing at the point of generation if the wastes are not placed '
             'outside on the land prior to shipment to a landfill for disposal and '
             'are either: disposed in a Subtitle D non-hazardous landfill licensed '
             'or permitted by the state or federal government; or disposed in a '
             'landfill licensed or permitted to accept the waste described as '
             'F019.'),
            ('F020', 'Wastes from production/use of tri- or tetrachlorophenol', ['H'],
             'Wastes (except wastewater and spent carbon from hydrogen chloride '
             'purification) from the production or manufacturing use (as a '
             'reactant, chemical intermediate, or component in a formulating '
             'process) of tri- or tetrachlorophenol, or of intermediates used to '
             'produce their pesticide derivatives. (This listing does not include '
             'wastes from the production of Hexachlorophene from highly purified '
             '2,4,5-trichlorophenol.)'),
            ('F021', 'Wastes from production/use of pentachlorophenol', ['H'],
             'Wastes (except wastewater and spent carbon from hydrogen chloride '
             'purification) from the production or manufacturing use (as a '
             'reactant, chemical intermediate, or component in a formulating '
             'process) of pentachlorophenol, or of intermediates used to produce '
             'its derivatives.'),
            ('F022', 'Wastes from use of tetra-, penta-, or hexachlorobenzene', ['H'],
             'Wastes (except wastewater and spent carbon from hydrogen chloride '
             'purification) from the manufacturing use (as a reactant, chemical '
             'intermediate, or component in a formulating process) of tetra-, '
             'penta-, or hexachlorobenzene under alkaline conditions.'),
            ('F023', 'Wastes from equipment previously used for tri-/tetrachlorophenols', ['H'],
             'Wastes (except wastewater and spent carbon from hydrogen chloride '
             'purification) from the production of materials on equipment '
             'previously used for the production or manufacturing use (as a '
             'reactant, chemical intermediate, or component in a formulating '
             'process) of tri- and tetrachlorophenols. (This listing does not '
             'include wastes from equipment used only for the production or use of '
             'Hexachlorophene from highly purified 2,4,5-trichlorophenol.)'),
            ('F024', 'Process wastes from chlorinated aliphatic hydrocarbon production', ['T'],
             'Process wastes, including but not limited to, distillation residues, '
             'heavy ends, tars, and reactor clean-out wastes, from the production '
             'of certain chlorinated aliphatic hydrocarbons by free radical '
             'catalyzed processes. These chlorinated aliphatic hydrocarbons are '
             'those having carbon chain lengths ranging from one to and including '
             'five, with varying amounts and positions of chlorine substitution. '
             '(This listing does not include wastewaters, wastewater treatment '
             'sludges, spent catalysts, and wastes listed in §261.31 or §261.32.)'),
            ('F025', 'Condensed light ends / spent filters from chlorinated aliphatics', ['T'],
             'Condensed light ends, spent filters and filter aids, and spent '
             'desiccant wastes from the production of certain chlorinated '
             'aliphatic hydrocarbons, by free radical catalyzed processes. These '
             'chlorinated aliphatic hydrocarbons are those having carbon chain '
             'lengths ranging from one to and including five, with varying amounts '
             'and positions of chlorine substitution.'),
            ('F026', 'Wastes from equipment previously used for chlorobenzene production', ['H'],
             'Wastes (except wastewater and spent carbon from hydrogen chloride '
             'purification) from the production of materials on equipment '
             'previously used for the manufacturing use (as a reactant, chemical '
             'intermediate, or component in a formulating process) of tetra-, '
             'penta-, or hexachlorobenzene under alkaline conditions.'),
            ('F027', 'Discarded unused tri-/tetra-/pentachlorophenol formulations', ['H'],
             'Discarded unused formulations containing tri-, tetra-, or '
             'pentachlorophenol or discarded unused formulations containing '
             'compounds derived from these chlorophenols. (This listing does not '
             'include formulations containing Hexachlorophene synthesized from '
             'prepurified 2,4,5-trichlorophenol as the sole component.)'),
            ('F028', 'Residues from incineration of F020-F023/F026-F027 soils', ['T'],
             'Residues resulting from the incineration or thermal treatment of '
             'soil contaminated with EPA Hazardous Waste Nos. F020, F021, F022, '
             'F023, F026, and F027.'),
            ('F032', 'Wood preserving wastes – chlorophenolic formulations', ['T'],
             'Wastewaters (except those that have not come into contact with '
             'process contaminants), process residuals, preservative drippage, and '
             'spent formulations from wood preserving processes generated at '
             'plants that currently use or have previously used chlorophenolic '
             'formulations (except potentially cross-contaminated wastes that have '
             'had the F032 waste code deleted in accordance with §261.35 or '
             'potentially cross-contaminated wastes that are otherwise currently '
             'regulated as hazardous wastes, and where the generator does not '
             'resume or initiate use of chlorophenolic formulations). This listing '
             'does not include K001 bottom sediment sludge from the treatment of '
             'wastewater from wood preserving processes that use creosote and/or '
             'pentachlorophenol.'),
            ('F034', 'Wood preserving wastes – creosote formulations', ['T'],
             'Wastewaters (except those that have not come into contact with '
             'process contaminants), process residuals, preservative drippage, and '
             'spent formulations from wood preserving processes generated at '
             'plants that use creosote formulations. This listing does not include '
             'K001 bottom sediment sludge from the treatment of wastewater from '
             'wood preserving processes that use creosote and/or pentachlorophenol.'),
            ('F035', 'Wood preserving wastes – inorganic (arsenic/chromium)', ['T'],
             'Wastewaters (except those that have not come into contact with '
             'process contaminants), process residuals, preservative drippage, and '
             'spent formulations from wood preserving processes generated at '
             'plants that use inorganic preservatives containing arsenic or '
             'chromium. This listing does not include K001 bottom sediment sludge '
             'from the treatment of wastewater from wood preserving processes that '
             'use creosote and/or pentachlorophenol.'),
            ('F037', 'Petroleum refinery primary oil/water/solids separation sludge', ['T'],
             'Petroleum refinery primary oil/water/solids separation sludge—Any '
             'sludge generated from the gravitational separation of oil/water/'
             'solids during the storage or treatment of process wastewaters and '
             'oily cooling wastewaters from petroleum refineries. Such sludges '
             'include, but are not limited to, those generated in oil/water/solids '
             'separators; tanks and impoundments; ditches and other conveyances; '
             'sumps; and stormwater units receiving dry weather flow. (See '
             '§261.31 for full exclusions.)'),
            ('F038', 'Petroleum refinery secondary (emulsified) separation sludge', ['T'],
             'Petroleum refinery secondary (emulsified) oil/water/solids '
             'separation sludge—Any sludge and/or float generated from the '
             'physical and/or chemical separation of oil/water/solids in process '
             'wastewaters and oily cooling wastewaters from petroleum refineries. '
             'Such wastes include, but are not limited to, all sludges and floats '
             'generated in: induced air flotation (IAF) units, tanks and '
             'impoundments, and all sludges generated in DAF units. (See §261.31 '
             'for full exclusions.)'),
            ('F039', 'Multi-source leachate', ['T'],
             'Leachate resulting from the disposal of more than one restricted '
             'waste classified as hazardous under subpart D of this part (leachate '
             'resulting from the disposal of one or more of the following EPA '
             'Hazardous Wastes and no other Hazardous Wastes retains its EPA '
             'Hazardous Waste Number(s): F020, F021, F022, F026, F027, and/or '
             'F028).'),
        ]
        f_list = [build_listed(c, n, 'F', hc, d) for (c, n, hc, d) in f_list_raw]

        # ── K-list: Hazardous wastes from specific sources (§261.32) ──────────
        k_list_raw = [
            # Wood preservation
            ('K001', 'Bottom sediment sludge – wood preserving (creosote/PCP)', ['T'],
             'Bottom sediment sludge from the treatment of wastewaters from wood '
             'preserving processes that use creosote and/or pentachlorophenol.'),
            # Inorganic pigments
            ('K002', 'WWT sludge – chrome yellow and orange pigments', ['T'],
             'Wastewater treatment sludge from the production of chrome yellow and '
             'orange pigments.'),
            ('K003', 'WWT sludge – molybdate orange pigments', ['T'],
             'Wastewater treatment sludge from the production of molybdate orange '
             'pigments.'),
            ('K004', 'WWT sludge – zinc yellow pigments', ['T'],
             'Wastewater treatment sludge from the production of zinc yellow '
             'pigments.'),
            ('K005', 'WWT sludge – chrome green pigments', ['T'],
             'Wastewater treatment sludge from the production of chrome green '
             'pigments.'),
            ('K006', 'WWT sludge – chrome oxide green pigments', ['T'],
             'Wastewater treatment sludge from the production of chrome oxide '
             'green pigments (anhydrous and hydrated).'),
            ('K007', 'WWT sludge – iron blue pigments', ['T'],
             'Wastewater treatment sludge from the production of iron blue '
             'pigments.'),
            ('K008', 'Oven residue – chrome oxide green pigments', ['T'],
             'Oven residue from the production of chrome oxide green pigments.'),
            # Organic chemicals
            ('K009', 'Distillation bottoms – acetaldehyde from ethylene', ['T'],
             'Distillation bottoms from the production of acetaldehyde from '
             'ethylene.'),
            ('K010', 'Distillation side cuts – acetaldehyde from ethylene', ['T'],
             'Distillation side cuts from the production of acetaldehyde from '
             'ethylene.'),
            ('K011', 'Bottom stream – wastewater stripper, acrylonitrile', ['R', 'T'],
             'Bottom stream from the wastewater stripper in the production of '
             'acrylonitrile.'),
            ('K013', 'Bottom stream – acetonitrile column, acrylonitrile', ['R', 'T'],
             'Bottom stream from the acetonitrile column in the production of '
             'acrylonitrile.'),
            ('K014', 'Bottoms – acetonitrile purification, acrylonitrile', ['T'],
             'Bottoms from the acetonitrile purification column in the production '
             'of acrylonitrile.'),
            ('K015', 'Still bottoms – distillation of benzyl chloride', ['T'],
             'Still bottoms from the distillation of benzyl chloride.'),
            ('K016', 'Heavy ends – carbon tetrachloride production', ['T'],
             'Heavy ends or distillation residues from the production of carbon '
             'tetrachloride.'),
            ('K017', 'Heavy ends – epichlorohydrin purification column', ['T'],
             'Heavy ends (still bottoms) from the purification column in the '
             'production of epichlorohydrin.'),
            ('K018', 'Heavy ends – ethyl chloride production', ['T'],
             'Heavy ends from the fractionation column in ethyl chloride '
             'production.'),
            ('K019', 'Heavy ends – ethylene dichloride production', ['T'],
             'Heavy ends from the distillation of ethylene dichloride in ethylene '
             'dichloride production.'),
            ('K020', 'Heavy ends – vinyl chloride monomer production', ['T'],
             'Heavy ends from the distillation of vinyl chloride in vinyl chloride '
             'monomer production.'),
            ('K021', 'Aqueous spent antimony catalyst – fluoromethanes', ['T'],
             'Aqueous spent antimony catalyst waste from fluoromethanes '
             'production.'),
            ('K022', 'Distillation bottom tars – phenol/acetone from cumene', ['T'],
             'Distillation bottom tars from the production of phenol/acetone from '
             'cumene.'),
            ('K023', 'Distillation light ends – phthalic anhydride from naphthalene', ['T'],
             'Distillation light ends from the production of phthalic anhydride '
             'from naphthalene.'),
            ('K024', 'Distillation bottoms – phthalic anhydride from naphthalene', ['T'],
             'Distillation bottoms from the production of phthalic anhydride from '
             'naphthalene.'),
            ('K025', 'Distillation bottoms – nitrobenzene by nitration of benzene', ['T'],
             'Distillation bottoms from the production of nitrobenzene by the '
             'nitration of benzene.'),
            ('K026', 'Stripping still tails – methyl ethyl pyridines', ['T'],
             'Stripping still tails from the production of methyl ethyl pyridines.'),
            ('K027', 'Centrifuge/distillation residues – toluene diisocyanate', ['R', 'T'],
             'Centrifuge and distillation residues from toluene diisocyanate '
             'production.'),
            ('K028', 'Spent catalyst – 1,1,1-trichloroethane hydrochlorinator', ['T'],
             'Spent catalyst from the hydrochlorinator reactor in the production '
             'of 1,1,1-trichloroethane.'),
            ('K029', 'Waste from product steam stripper – 1,1,1-trichloroethane', ['T'],
             'Waste from the product steam stripper in the production of '
             '1,1,1-trichloroethane.'),
            ('K030', 'Column bottoms – trichloroethylene/perchloroethylene', ['T'],
             'Column bottoms or heavy ends from the combined production of '
             'trichloroethylene and perchloroethylene.'),
            ('K083', 'Distillation bottoms – aniline production', ['T'],
             'Distillation bottoms from aniline production.'),
            ('K085', 'Distillation/fractionation bottoms – chlorobenzenes', ['T'],
             'Distillation or fractionation column bottoms from the production of '
             'chlorobenzenes.'),
            ('K093', 'Distillation light ends – phthalic anhydride from o-xylene', ['T'],
             'Distillation light ends from the production of phthalic anhydride '
             'from ortho-xylene.'),
            ('K094', 'Distillation bottoms – phthalic anhydride from o-xylene', ['T'],
             'Distillation bottoms from the production of phthalic anhydride from '
             'ortho-xylene.'),
            ('K095', 'Distillation bottoms – 1,1,1-trichloroethane', ['T'],
             'Distillation bottoms from the production of 1,1,1-trichloroethane.'),
            ('K096', 'Heavy ends – 1,1,1-trichloroethane heavy ends column', ['T'],
             'Heavy ends from the heavy ends column from the production of '
             '1,1,1-trichloroethane.'),
            ('K103', 'Process residues – aniline extraction', ['T'],
             'Process residues from aniline extraction from the production of '
             'aniline.'),
            ('K104', 'Combined wastewater – nitrobenzene/aniline production', ['T'],
             'Combined wastewater streams generated from nitrobenzene/aniline '
             'production.'),
            ('K105', 'Separated aqueous stream – chlorobenzene reactor washing', ['T'],
             'Separated aqueous stream from the reactor product washing step in '
             'the production of chlorobenzenes.'),
            ('K107', 'Column bottoms – UDMH from carboxylic acid hydrazides', ['C', 'T'],
             'Column bottoms from product separation from the production of '
             '1,1-dimethylhydrazine (UDMH) from carboxylic acid hydrazides.'),
            ('K108', 'Condensed overheads/vent gases – UDMH production', ['I', 'T'],
             'Condensed column overheads from product separation and condensed '
             'reactor vent gases from the production of 1,1-dimethylhydrazine '
             '(UDMH) from carboxylic acid hydrazides.'),
            ('K109', 'Spent filter cartridges – UDMH purification', ['T'],
             'Spent filter cartridges from product purification from the '
             'production of 1,1-dimethylhydrazine (UDMH) from carboxylic acid '
             'hydrazides.'),
            ('K110', 'Condensed overheads – UDMH intermediate separation', ['T'],
             'Condensed column overheads from intermediate separation from the '
             'production of 1,1-dimethylhydrazine (UDMH) from carboxylic acid '
             'hydrazides.'),
            ('K111', 'Product washwaters – dinitrotoluene via nitration of toluene', ['C', 'T'],
             'Product washwaters from the production of dinitrotoluene via '
             'nitration of toluene.'),
            ('K112', 'Reaction by-product water – toluenediamine drying column', ['T'],
             'Reaction by-product water from the drying column in the production '
             'of toluenediamine via hydrogenation of dinitrotoluene.'),
            ('K113', 'Condensed liquid light ends – toluenediamine purification', ['T'],
             'Condensed liquid light ends from the purification of toluenediamine '
             'in the production of toluenediamine via hydrogenation of '
             'dinitrotoluene.'),
            ('K114', 'Vicinals – toluenediamine purification', ['T'],
             'Vicinals from the purification of toluenediamine in the production '
             'of toluenediamine via hydrogenation of dinitrotoluene.'),
            ('K115', 'Heavy ends – toluenediamine purification', ['T'],
             'Heavy ends from the purification of toluenediamine in the production '
             'of toluenediamine via hydrogenation of dinitrotoluene.'),
            ('K116', 'Organic condensate – TDI solvent recovery column', ['T'],
             'Organic condensate from the solvent recovery column in the '
             'production of toluene diisocyanate via phosgenation of '
             'toluenediamine.'),
            ('K117', 'Wastewater – ethylene dibromide reactor vent gas scrubber', ['T'],
             'Wastewater from the reactor vent gas scrubber in the production of '
             'ethylene dibromide via bromination of ethene.'),
            ('K118', 'Spent adsorbent solids – ethylene dibromide purification', ['T'],
             'Spent adsorbent solids from purification of ethylene dibromide in '
             'the production of ethylene dibromide via bromination of ethene.'),
            ('K136', 'Still bottoms – ethylene dibromide purification', ['T'],
             'Still bottoms from the purification of ethylene dibromide in the '
             'production of ethylene dibromide via bromination of ethene.'),
            ('K149', 'Distillation bottoms – chlorinated toluenes/benzoyl chlorides', ['T'],
             'Distillation bottoms from the production of alpha- (or methyl-) '
             'chlorinated toluenes, ring-chlorinated toluenes, benzoyl chlorides, '
             'and compounds with mixtures of these functional groups. (This waste '
             'does not include still bottoms from the distillation of benzyl '
             'chloride.)'),
            ('K150', 'Organic residuals – chlorinated toluene chlorine/HCl recovery', ['T'],
             'Organic residuals, excluding spent carbon adsorbent, from the spent '
             'chlorine gas and hydrochloric acid recovery processes associated '
             'with the production of alpha- (or methyl-) chlorinated toluenes, '
             'ring-chlorinated toluenes, benzoyl chlorides, and compounds with '
             'mixtures of these functional groups.'),
            ('K151', 'WWT sludges – chlorinated toluene production', ['T'],
             'Wastewater treatment sludges, excluding neutralization and '
             'biological sludges, generated during the treatment of wastewaters '
             'from the production of alpha- (or methyl-) chlorinated toluenes, '
             'ring-chlorinated toluenes, benzoyl chlorides, and compounds with '
             'mixtures of these functional groups.'),
            ('K156', 'Organic waste – carbamates and carbamoyl oximes', ['T'],
             'Organic waste (including heavy ends, still bottoms, light ends, '
             'spent solvents, filtrates, and decantates) from the production of '
             'carbamates and carbamoyl oximes. (This listing does not apply to '
             'wastes generated from the manufacture of 3-iodo-2-propynyl '
             'n-butylcarbamate.)'),
            ('K157', 'Wastewaters – carbamates and carbamoyl oximes', ['T'],
             'Wastewaters (including scrubber waters, condenser waters, '
             'washwaters, and separation waters) from the production of carbamates '
             'and carbamoyl oximes. (This listing does not apply to wastes '
             'generated from the manufacture of 3-iodo-2-propynyl '
             'n-butylcarbamate.)'),
            ('K158', 'Bag house dusts/filter solids – carbamates and carbamoyl oximes', ['T'],
             'Bag house dusts and filter/separation solids from the production of '
             'carbamates and carbamoyl oximes.'),
            ('K159', 'Organics from treatment of thiocarbamate wastes', ['T'],
             'Organics from the treatment of thiocarbamate wastes.'),
            ('K161', 'Purification solids/dust – dithiocarbamate acids and salts', ['R', 'T'],
             'Purification solids (including filtration, evaporation, and '
             'centrifugation solids), bag house dust and floor sweepings from the '
             'production of dithiocarbamate acids and their salts. (This listing '
             'does not include K125 or K126.)'),
            ('K174', 'WWT sludges – ethylene dichloride/vinyl chloride monomer', ['T'],
             'Wastewater treatment sludges from the production of ethylene '
             'dichloride or vinyl chloride monomer (including sludges that result '
             'from commingled ethylene dichloride or vinyl chloride monomer '
             'wastewater) but not including sludges that do not contain dioxin in '
             'a measurable concentration.'),
            ('K175', 'WWT sludge – vinyl chloride monomer (mercuric chloride catalyst)', ['T'],
             'Wastewater treatment sludge from the production of vinyl chloride '
             'monomer using mercuric chloride catalyst in an acetylene-based '
             'process.'),
            ('K181', 'Nonwastewaters – dyes and/or pigments production', ['T'],
             'Nonwastewaters from the production of dyes and/or pigments '
             '(including nonwastewaters commingled at the point of generation with '
             'nonwastewaters from other processes) that, at the point of '
             'generation, contain mass loadings of any of the constituents '
             'identified in 40 CFR 261.32 above the listed levels.'),
            # Inorganic chemicals (chlorine production)
            ('K071', 'Brine purification muds – mercury cell chlorine process', ['T'],
             'Brine purification muds from the mercury cell process in chlorine '
             'production, where separately prepurified brine is not used.'),
            ('K073', 'Chlorinated hydrocarbon waste – diaphragm cell chlorine process', ['T'],
             'Chlorinated hydrocarbon waste from the purification step of the '
             'diaphragm cell process using graphite anodes in chlorine '
             'production.'),
            ('K106', 'WWT sludge – mercury cell chlorine process', ['T'],
             'Wastewater treatment sludge from the mercury cell process in '
             'chlorine production.'),
            # Pesticides
            ('K031', 'By-product salts – MSMA and cacodylic acid', ['T'],
             'By-product salts generated in the production of MSMA and cacodylic '
             'acid.'),
            ('K032', 'WWT sludge – chlordane production', ['T'],
             'Wastewater treatment sludge from the production of chlordane.'),
            ('K033', 'Wastewater/scrub water – cyclopentadiene chlorination (chlordane)', ['T'],
             'Wastewater and scrub water from the chlorination of cyclopentadiene '
             'in the production of chlordane.'),
            ('K034', 'Filter solids – hexachlorocyclopentadiene filtration (chlordane)', ['T'],
             'Filter solids from the filtration of hexachlorocyclopentadiene in '
             'the production of chlordane.'),
            ('K035', 'WWT sludges – creosote production', ['T'],
             'Wastewater treatment sludges generated in the production of '
             'creosote.'),
            ('K036', 'Still bottoms – toluene reclamation (disulfoton)', ['T'],
             'Still bottoms from toluene reclamation distillation in the '
             'production of disulfoton.'),
            ('K037', 'WWT sludges – disulfoton production', ['T'],
             'Wastewater treatment sludges from the production of disulfoton.'),
            ('K038', 'Wastewater – washing/stripping of phorate production', ['T'],
             'Wastewater from the washing and stripping of phorate production.'),
            ('K039', 'Filter cake – diethylphosphorodithioic acid (phorate)', ['T'],
             'Filter cake from the filtration of diethylphosphorodithioic acid in '
             'the production of phorate.'),
            ('K040', 'WWT sludge – phorate production', ['T'],
             'Wastewater treatment sludge from the production of phorate.'),
            ('K041', 'WWT sludge – toxaphene production', ['T'],
             'Wastewater treatment sludge from the production of toxaphene.'),
            ('K042', 'Heavy ends – tetrachlorobenzene distillation (2,4,5-T)', ['T'],
             'Heavy ends or distillation residues from the distillation of '
             'tetrachlorobenzene in the production of 2,4,5-T.'),
            ('K043', '2,6-Dichlorophenol waste – 2,4-D production', ['T'],
             '2,6-Dichlorophenol waste from the production of 2,4-D.'),
            ('K097', 'Vacuum stripper discharge – chlordane chlorinator', ['T'],
             'Vacuum stripper discharge from the chlordane chlorinator in the '
             'production of chlordane.'),
            ('K098', 'Untreated process wastewater – toxaphene production', ['T'],
             'Untreated process wastewater from the production of toxaphene.'),
            ('K099', 'Untreated wastewater – 2,4-D production', ['T'],
             'Untreated wastewater from the production of 2,4-D.'),
            ('K123', 'Process wastewater – EBDC acid and salts', ['T'],
             'Process wastewater (including supernates, filtrates, and washwaters) '
             'from the production of ethylenebisdithiocarbamic acid and its '
             'salts.'),
            ('K124', 'Reactor vent scrubber water – EBDC acid and salts', ['C', 'T'],
             'Reactor vent scrubber water from the production of '
             'ethylenebisdithiocarbamic acid and its salts.'),
            ('K125', 'Filtration/evaporation/centrifugation solids – EBDC acid and salts', ['T'],
             'Filtration, evaporation, and centrifugation solids from the '
             'production of ethylenebisdithiocarbamic acid and its salts.'),
            ('K126', 'Baghouse dust/floor sweepings – EBDC milling and packaging', ['T'],
             'Baghouse dust and floor sweepings in milling and packaging '
             'operations from the production or formulation of '
             'ethylenebisdithiocarbamic acid and its salts.'),
            ('K131', 'Wastewater/spent sulfuric acid – methyl bromide production', ['C', 'T'],
             'Wastewater from the reactor and spent sulfuric acid from the acid '
             'dryer from the production of methyl bromide.'),
            ('K132', 'Spent absorbent/separator solids – methyl bromide production', ['T'],
             'Spent absorbent and wastewater separator solids from the production '
             'of methyl bromide.'),
            # Explosives
            ('K044', 'WWT sludges – manufacturing/processing of explosives', ['R'],
             'Wastewater treatment sludges from the manufacturing and processing '
             'of explosives.'),
            ('K045', 'Spent carbon – treatment of explosives wastewater', ['R'],
             'Spent carbon from the treatment of wastewater containing '
             'explosives.'),
            ('K046', 'WWT sludges – lead-based initiating compounds', ['T'],
             'Wastewater treatment sludges from the manufacturing, formulation and '
             'loading of lead-based initiating compounds.'),
            ('K047', 'Pink/red water from TNT operations', ['R'],
             'Pink/red water from TNT operations.'),
            # Petroleum refining
            ('K048', 'DAF float – petroleum refining', ['T'],
             'Dissolved air flotation (DAF) float from the petroleum refining '
             'industry.'),
            ('K049', 'Slop oil emulsion solids – petroleum refining', ['T'],
             'Slop oil emulsion solids from the petroleum refining industry.'),
            ('K050', 'Heat exchanger bundle cleaning sludge – petroleum refining', ['T'],
             'Heat exchanger bundle cleaning sludge from the petroleum refining '
             'industry.'),
            ('K051', 'API separator sludge – petroleum refining', ['T'],
             'API separator sludge from the petroleum refining industry.'),
            ('K052', 'Tank bottoms (leaded) – petroleum refining', ['T'],
             'Tank bottoms (leaded) from the petroleum refining industry.'),
            ('K169', 'Crude oil storage tank sediment – petroleum refining', ['T'],
             'Crude oil storage tank sediment from petroleum refining '
             'operations.'),
            ('K170', 'Clarified slurry oil tank sediment – petroleum refining', ['T'],
             'Clarified slurry oil tank sediment and/or in-line filter/separation '
             'solids from petroleum refining operations.'),
            ('K171', 'Spent hydrotreating catalyst – petroleum refining', ['I', 'T'],
             'Spent hydrotreating catalyst from petroleum refining operations, '
             'including guard beds used to desulfurize feeds to other catalytic '
             'reactors (this listing does not include inert support media).'),
            ('K172', 'Spent hydrorefining catalyst – petroleum refining', ['I', 'T'],
             'Spent hydrorefining catalyst from petroleum refining operations, '
             'including guard beds used to desulfurize feeds to other catalytic '
             'reactors (this listing does not include inert support media).'),
            # Iron and steel
            ('K061', 'Emission control dust/sludge – primary steel in electric furnaces', ['T'],
             'Emission control dust/sludge from the primary production of steel in '
             'electric furnaces.'),
            ('K062', 'Spent pickle liquor – steel finishing operations', ['C', 'T'],
             'Spent pickle liquor generated by steel finishing operations of '
             'facilities within the iron and steel industry (SIC Codes 331 and '
             '332).'),
            # Primary copper / lead / zinc / aluminum
            ('K064', 'Acid plant blowdown slurry/sludge – primary copper', ['T'],
             'Acid plant blowdown slurry/sludge resulting from the thickening of '
             'blowdown slurry from primary copper production.'),
            ('K065', 'Surface impoundment solids – primary lead smelting', ['T'],
             'Surface impoundment solids contained in and dredged from surface '
             'impoundments at primary lead smelting facilities.'),
            ('K066', 'Sludge – primary zinc production wastewater/acid plant blowdown', ['T'],
             'Sludge from treatment of process wastewater and/or acid plant '
             'blowdown from primary zinc production.'),
            ('K088', 'Spent potliners – primary aluminum reduction', ['T'],
             'Spent potliners from primary aluminum reduction.'),
            # Ferroalloys
            ('K090', 'Emission control dust/sludge – ferrochromiumsilicon production', ['T'],
             'Emission control dust or sludge from ferrochromiumsilicon '
             'production.'),
            ('K091', 'Emission control dust/sludge – ferrochromium production', ['T'],
             'Emission control dust or sludge from ferrochromium production.'),
            # Secondary lead
            ('K069', 'Emission control dust/sludge – secondary lead smelting', ['T'],
             'Emission control dust/sludge from secondary lead smelting. (Note: '
             'This listing is stayed administratively for sludge generated from '
             'secondary acid scrubber systems. The stay will remain in effect '
             'until further administrative action is taken.)'),
            ('K100', 'Waste leaching solution – secondary lead emission control dust', ['T'],
             'Waste leaching solution from acid leaching of emission control dust/'
             'sludge from secondary lead smelting.'),
            # Veterinary pharmaceuticals (arsenic / organo-arsenic)
            ('K084', 'WWT sludges – veterinary pharmaceuticals (arsenic compounds)', ['T'],
             'Wastewater treatment sludges generated during the production of '
             'veterinary pharmaceuticals from arsenic or organo-arsenic '
             'compounds.'),
            ('K101', 'Distillation tar residues – veterinary pharmaceuticals (arsenic)', ['T'],
             'Distillation tar residues from the distillation of aniline-based '
             'compounds in the production of veterinary pharmaceuticals from '
             'arsenic or organo-arsenic compounds.'),
            ('K102', 'Activated carbon residue – veterinary pharmaceuticals (arsenic)', ['T'],
             'Residue from the use of activated carbon for decolorization in the '
             'production of veterinary pharmaceuticals from arsenic or '
             'organo-arsenic compounds.'),
            # Ink formulation
            ('K086', 'Solvent/caustic/water washes and sludges – ink formulation', ['T'],
             'Solvent washes and sludges, caustic washes and sludges, or water '
             'washes and sludges from cleaning tubs and equipment used in the '
             'formulation of ink from pigments, driers, soaps, and stabilizers '
             'containing chromium and lead.'),
            # Coking
            ('K060', 'Ammonia still lime sludge – coking operations', ['T'],
             'Ammonia still lime sludge from coking operations.'),
            ('K087', 'Decanter tank tar sludge – coking operations', ['T'],
             'Decanter tank tar sludge from coking operations.'),
            ('K141', 'Process residues – coal tar recovery (coke by-products)', ['T'],
             'Process residues from the recovery of coal tar, including, but not '
             'limited to, collecting sump residues from the production of coke '
             'from coal or the recovery of coke by-products produced from coal. '
             '(This listing does not include K087.)'),
            ('K142', 'Tar storage tank residues – coke by-products', ['T'],
             'Tar storage tank residues from the production of coke from coal or '
             'from the recovery of coke by-products produced from coal.'),
            ('K143', 'Process residues – light oil recovery (coke by-products)', ['T'],
             'Process residues from the recovery of light oil, including, but not '
             'limited to, those generated in stills, decanters, and wash oil '
             'recovery units from the recovery of coke by-products produced from '
             'coal.'),
            ('K144', 'Wastewater sump residues – light oil refining (coke by-products)', ['T'],
             'Wastewater sump residues from light oil refining, including, but not '
             'limited to, intercepting or contamination sump sludges from the '
             'recovery of coke by-products produced from coal.'),
            ('K145', 'Residues – naphthalene collection/recovery (coke by-products)', ['T'],
             'Residues from naphthalene collection and recovery operations from '
             'the recovery of coke by-products produced from coal.'),
            ('K147', 'Tar storage tank residues – coal tar refining', ['T'],
             'Tar storage tank residues from coal tar refining.'),
            ('K148', 'Residues – coal tar distillation', ['T'],
             'Residues from coal tar distillation, including but not limited to '
             'still bottoms.'),
        ]
        k_list = [build_listed(c, n, 'K', hc, d) for (c, n, hc, d) in k_list_raw]

        def upsert(data_list):
            nonlocal created, updated
            for item in data_list:
                defaults = {k: v for k, v in item.items() if k != 'name'}
                defaults.setdefault('source', 'epa_import')
                defaults.setdefault('added_by', 'Admin')
                obj, was_created = Chemical.objects.get_or_create(
                    name=item['name'],
                    defaults=defaults,
                )
                if was_created:
                    created += 1
                else:
                    # Update fields in case data changed
                    for k, v in defaults.items():
                        setattr(obj, k, v)
                    obj.save()
                    updated += 1

        upsert(d_list)
        upsert(p_list)
        upsert(u_list)
        upsert(other_chemicals)
        upsert(f_list)
        upsert(k_list)

        # Set all created_at / updated_at dates to 2026-05-04 for every record
        target_date = timezone.datetime(2026, 5, 4, 0, 0, 0, tzinfo=timezone.utc)
        Chemical.objects.all().update(created_at=target_date, updated_at=target_date)

        self.stdout.write(
            self.style.SUCCESS(
                f'Done. Created: {created}, Updated: {updated}. '
                f'Total chemicals: {Chemical.objects.count()}'
            )
        )

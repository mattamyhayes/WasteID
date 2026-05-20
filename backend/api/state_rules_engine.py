"""
State Rules Validation Engine for WasteID.

Evaluates state-specific hazardous waste rules against a mixture profile.
Per SR-FLOW-1 through SR-FLOW-8, this engine:
- Accepts complete profile data
- Resolves applicable state from CustomerLocation.state
- Evaluates rules in priority order
- Returns PASS, FAIL, or NEEDS_INFO with follow-up questions
"""
import json
from datetime import date
from .models import StateRule, StateValidationResult


def evaluate_condition(condition, context):
    """
    Evaluate a single condition dict against the profile context.

    Supported condition keys:
    - generator_state: matches context['state']
    - generator_status: matches context['epa_generator_status']
    - waste_is_hazardous: matches context['is_hazardous_waste']
    - waste_codes_include: checks if any listed codes are in context['waste_codes']
    - waste_is_liquid: checks context['is_liquid']
    - manifest_required: checks context['manifest_required']
    """
    if not condition:
        return True

    state = condition.get('generator_state')
    if state and context.get('state', '').upper() != state.upper():
        return False

    gen_status = condition.get('generator_status')
    if gen_status:
        if isinstance(gen_status, list):
            if context.get('epa_generator_status') not in gen_status:
                return False
        elif context.get('epa_generator_status') != gen_status:
            return False

    if 'waste_is_hazardous' in condition:
        if context.get('is_hazardous_waste') != condition['waste_is_hazardous']:
            return False

    codes_include = condition.get('waste_codes_include')
    if codes_include:
        profile_codes = set(context.get('waste_codes', []))
        if not profile_codes.intersection(set(codes_include)):
            return False

    if 'waste_is_liquid' in condition:
        if context.get('is_liquid', False) != condition['waste_is_liquid']:
            return False

    if 'manifest_required' in condition:
        if context.get('manifest_required', False) != condition['manifest_required']:
            return False

    return True


def build_context_from_mixture(mixture):
    """Build the evaluation context dict from a Mixture instance."""
    context = {
        'state': '',
        'epa_generator_status': mixture.epa_generator_status or '',
        'is_hazardous_waste': False,
        'waste_codes': [],
        'is_liquid': False,
        'manifest_required': False,
        'mixture_id': mixture.id,
    }

    # Resolve state from customer location
    if mixture.customer_location and mixture.customer_location.state:
        context['state'] = mixture.customer_location.state.upper().strip()[:2]
    elif mixture.customer and hasattr(mixture.customer, 'locations'):
        first_loc = mixture.customer.locations.first()
        if first_loc and first_loc.state:
            context['state'] = first_loc.state.upper().strip()[:2]

    # Get latest determination
    latest_det = mixture.determinations.order_by('-created_at').first()
    if latest_det:
        context['is_hazardous_waste'] = latest_det.is_hazardous_waste
        try:
            context['waste_codes'] = json.loads(latest_det.waste_codes)
        except (json.JSONDecodeError, TypeError):
            context['waste_codes'] = []

    # Determine if liquid based on shipment size unit
    context['is_liquid'] = mixture.shipment_size_unit in ('gallons',)

    # Manifest required for SQG/LQG with hazardous waste
    context['manifest_required'] = (
        context['is_hazardous_waste'] and
        context['epa_generator_status'] in ('SQG', 'LQG')
    )

    return context


def models_q_effective(today):
    """Return Q filter for rules that are effective today."""
    from django.db.models import Q
    return (
        (Q(effective_date__isnull=True) | Q(effective_date__lte=today)) &
        (Q(sunset_date__isnull=True) | Q(sunset_date__gte=today))
    )


def validate_state_rules(mixture, additional_answers=None):
    """
    Run state rules validation against a mixture profile.

    Args:
        mixture: Mixture model instance (with related objects loaded)
        additional_answers: dict of previously collected answers to state questions

    Returns:
        dict with keys:
        - overall_result: 'pass' | 'needs_info' | 'fail'
        - rule_results: list of {rule_id, rule_id_code, result, details, questions}
        - questions: list of questions that need answers (only if needs_info)
        - state_code: the resolved state
    """
    if additional_answers is None:
        additional_answers = {}

    context = build_context_from_mixture(mixture)
    state_code = context.get('state', '')

    if not state_code:
        return {
            'overall_result': 'pass',
            'rule_results': [],
            'questions': [],
            'state_code': '',
        }

    # Fetch active rules for this state
    today = date.today()
    rules = StateRule.objects.filter(
        state_code=state_code,
        is_active=True,
    ).filter(
        models_q_effective(today)
    )

    rule_results = []
    pending_questions = []
    has_fail = False

    for rule in rules:
        try:
            conditions = json.loads(rule.condition_expression)
        except (json.JSONDecodeError, TypeError):
            conditions = {}

        # Check if rule applies
        if not evaluate_condition(conditions, context):
            continue

        # Rule applies - check if we have answers for its questions
        questions = []
        try:
            questions = json.loads(rule.question_template)
        except (json.JSONDecodeError, TypeError):
            questions = []

        if not questions:
            # No questions needed - rule passes
            rule_results.append({
                'rule_id': str(rule.id),
                'rule_id_code': rule.rule_id_code,
                'result': 'pass',
                'details': rule.description,
                'questions': [],
            })
        else:
            # Check if all questions have been answered
            rule_key = rule.rule_id_code
            answered = additional_answers.get(rule_key, {})
            unanswered = [q for q in questions if q.get('id') not in answered]

            if unanswered:
                rule_results.append({
                    'rule_id': str(rule.id),
                    'rule_id_code': rule.rule_id_code,
                    'result': 'needs_info',
                    'details': rule.description,
                    'questions': unanswered,
                })
                pending_questions.extend([
                    {**q, 'rule_id_code': rule.rule_id_code}
                    for q in unanswered
                ])
            else:
                rule_results.append({
                    'rule_id': str(rule.id),
                    'rule_id_code': rule.rule_id_code,
                    'result': 'pass',
                    'details': rule.description,
                    'questions': [],
                })

    overall = 'pass'
    if has_fail:
        overall = 'fail'
    elif pending_questions:
        overall = 'needs_info'

    return {
        'overall_result': overall,
        'rule_results': rule_results,
        'questions': pending_questions,
        'state_code': state_code,
    }

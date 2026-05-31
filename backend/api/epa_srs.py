"""
EPA Substance Registry Services (SRS) Lookup Service.

Provides a backend proxy to the EPA SRS REST API at:
https://cdxapps.epa.gov/oms-substance-registry-services/rest-api/

Supported search methods:
  - By Substance Name
  - By CAS Number
  - By EPA Internal Tracking Number (Substance ID)
"""

import requests
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

EPA_SRS_BASE_URL = "https://cdxapps.epa.gov/oms-substance-registry-services/rest-api"

# Timeout for outbound requests to EPA (seconds)
REQUEST_TIMEOUT = 30


@api_view(['GET'])
def epa_srs_lookup(request):
    """
    Proxy endpoint for EPA SRS lookups.

    Query Parameters:
        search_type (str): One of 'name', 'cas', 'id'
        query (str): The search value (substance name, CAS number, or SRS ID)
        list_acronym (str, optional): Filter by EPA list acronym (e.g. TSCA, RCRA)
        exclude_synonyms (bool, optional): Exclude synonym data from response

    Returns:
        JSON response from EPA SRS API or an error message.
    """
    search_type = request.query_params.get('search_type', '').strip().lower()
    query = request.query_params.get('query', '').strip()
    list_acronym = request.query_params.get('list_acronym', '').strip()
    exclude_synonyms = request.query_params.get('exclude_synonyms', '').strip().lower() == 'true'

    if not search_type:
        return Response(
            {'error': 'search_type parameter is required. Must be one of: name, cas, id'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not query:
        return Response(
            {'error': 'query parameter is required.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Build the EPA SRS URL based on search type
    try:
        url, params = _build_srs_request(search_type, query, list_acronym, exclude_synonyms)
    except ValueError:
        return Response(
            {'error': f"Invalid search_type '{search_type}'. Must be one of: name, cas, id"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Make the request to EPA SRS
    try:
        response = requests.get(url, params=params, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
    except requests.exceptions.Timeout:
        return Response(
            {'error': 'Request to EPA SRS timed out. Please try again.'},
            status=status.HTTP_504_GATEWAY_TIMEOUT
        )
    except requests.exceptions.ConnectionError:
        return Response(
            {'error': 'Unable to connect to EPA SRS service. The service may be temporarily unavailable.'},
            status=status.HTTP_502_BAD_GATEWAY
        )
    except requests.exceptions.HTTPError as e:
        if e.response is not None and e.response.status_code == 404:
            return Response(
                {'error': 'No results found for the given query.', 'results': []},
                status=status.HTTP_200_OK
            )
        return Response(
            {'error': f'EPA SRS returned an error: {e.response.status_code if e.response else "unknown"}'},
            status=status.HTTP_502_BAD_GATEWAY
        )

    # Parse and return response
    try:
        data = response.json()
    except ValueError:
        return Response(
            {'error': 'EPA SRS returned an invalid response format.'},
            status=status.HTTP_502_BAD_GATEWAY
        )

    # Normalize response to always return a list
    if isinstance(data, dict):
        results = [data]
    elif isinstance(data, list):
        results = data
    else:
        results = []

    return Response({
        'results': results,
        'count': len(results),
        'search_type': search_type,
        'query': query,
    })


def _build_srs_request(search_type, query, list_acronym='', exclude_synonyms=False):
    """
    Build the appropriate EPA SRS API URL and parameters.

    Returns:
        tuple: (url, params_dict)

    Raises:
        ValueError: If search_type is not recognized.
    """
    params = {}

    if search_type == 'name':
        url = f"{EPA_SRS_BASE_URL}/substances/name"
        params['nameList'] = query
        if list_acronym:
            params['listAcronym'] = list_acronym
        if exclude_synonyms:
            params['excludeSynonyms'] = 'true'

    elif search_type == 'cas':
        url = f"{EPA_SRS_BASE_URL}/substances/cas"
        params['casList'] = query
        if list_acronym:
            params['listAcronym'] = list_acronym
        if exclude_synonyms:
            params['excludeSynonyms'] = 'true'

    elif search_type == 'id':
        url = f"{EPA_SRS_BASE_URL}/substance/{query}"

    else:
        raise ValueError(
            f"Invalid search_type '{search_type}'. Must be one of: name, cas, id"
        )

    return url, params

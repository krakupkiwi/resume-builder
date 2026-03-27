from app.services.linkedin_service import parse_linkedin_export, _normalise_date, _extract_positions


def test_parse_basic_profile():
    data = {
        "profile": {
            "firstName": "Alice",
            "lastName": "Smith",
            "headline": "Software Engineer",
            "summary": "Experienced developer",
            "geoLocationName": "London, UK",
        }
    }
    result = parse_linkedin_export(data)
    assert result["full_name"] == "Alice Smith"
    assert result["location"] == "London, UK"
    assert result["summary"] == "Experienced developer"


def test_normalise_date_formats():
    assert _normalise_date("2020-01") == "2020-01"
    assert _normalise_date("2020") == "2020"
    assert _normalise_date("Jan 2020") == "2020-01"
    assert _normalise_date("2020-01-15") == "2020-01"
    assert _normalise_date({"year": 2021, "month": 3}) == "2021-03"
    assert _normalise_date(None) is None


def test_extract_positions():
    data = {
        "positions": [
            {"companyName": "Acme Corp", "title": "Engineer", "description": "Built Python services"}
        ]
    }
    positions = _extract_positions(data)
    assert len(positions) == 1
    assert positions[0]["company"] == "Acme Corp"
    assert positions[0]["title"] == "Engineer"

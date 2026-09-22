import logging

from app.main import AccessTokenRedactionFilter


def test_access_log_redacts_download_token_query_value():
    record = logging.LogRecord(
        name="uvicorn.access",
        level=logging.INFO,
        pathname=__file__,
        lineno=1,
        msg='%s - "%s %s HTTP/%s" %d',
        args=(
            "127.0.0.1:1234",
            "GET",
            "/files/download/job-id?token=secret-value&safe=1",
            "1.1",
            200,
        ),
        exc_info=None,
    )

    AccessTokenRedactionFilter().filter(record)

    rendered = record.getMessage()
    assert "secret-value" not in rendered
    assert "token=<redacted>" in rendered
    assert "safe=1" in rendered

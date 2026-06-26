import os
import sys
import urllib.error
import urllib.request


def main() -> int:
    health_url = os.environ.get("TUTR_API_HEALTH_URL", "").strip()
    if not health_url:
        print("TUTR_API_HEALTH_URL is not set; skipping keep-awake ping.")
        return 0

    request = urllib.request.Request(
        health_url,
        headers={"User-Agent": "tutr-render-keep-awake/1.0"},
    )

    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            status = response.getcode()
    except urllib.error.HTTPError as error:
        print(f"Health ping failed with HTTP {error.code}: {health_url}", file=sys.stderr)
        return 1
    except urllib.error.URLError as error:
        print(f"Health ping failed: {error.reason}", file=sys.stderr)
        return 1
    except TimeoutError:
        print("Health ping timed out.", file=sys.stderr)
        return 1

    if 200 <= status < 400:
        print(f"Health ping succeeded with HTTP {status}: {health_url}")
        return 0

    print(f"Health ping returned unexpected HTTP {status}: {health_url}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())

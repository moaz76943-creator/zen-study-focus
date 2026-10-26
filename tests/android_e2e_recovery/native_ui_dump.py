"""Read actual native hierarchy without disconnecting UiAutomation."""
import json
import socket
import xml.etree.ElementTree as ET
import sys

request = "DUMP"
if len(sys.argv) > 2:
    # Parse real XML attributes, including entities, before exact native match.
    node = ET.fromstring(sys.argv[2])
    selector = {key: node.get(key, "") for key in
                ("class", "resource-id", "text", "content-desc", "hint")}
    request = ("TOUCH_FILE " if len(sys.argv)>3 and sys.argv[3]=="--finger" else "CLICK ") + json.dumps(selector, ensure_ascii=False)

with socket.create_connection(("127.0.0.1", int(sys.argv[1])), timeout=15) as connection:
    connection.sendall((request + "\n").encode("utf-8"))
    with connection.makefile("rb") as stream:
        reply = stream.readline(8 * 1024 * 1024 + 1)
        if not reply.endswith(b"\n") or len(reply) > 8 * 1024 * 1024:
            raise SystemExit("Native hierarchy reply missing or oversized")
        sys.stdout.write(reply.decode("utf-8"))

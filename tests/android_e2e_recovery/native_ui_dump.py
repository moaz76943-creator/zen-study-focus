"""Read actual native hierarchy without disconnecting UiAutomation."""
import socket
import sys

with socket.create_connection(("127.0.0.1", int(sys.argv[1])), timeout=15) as connection:
    connection.sendall(b"DUMP\n")
    with connection.makefile("rb") as stream:
        reply = stream.readline(8 * 1024 * 1024 + 1)
        if not reply.endswith(b"\n") or len(reply) > 8 * 1024 * 1024:
            raise SystemExit("Native hierarchy reply missing or oversized")
        sys.stdout.write(reply.decode("utf-8"))

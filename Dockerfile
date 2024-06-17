FROM alpine:3.20

RUN apk add --no-cache jq curl

COPY back-merge-request.sh /
RUN chmod +x /back-merge-request.sh

ENTRYPOINT ["/back-merge-request.sh"]

FROM node@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20
WORKDIR /app
COPY server ./server
COPY web ./web
ENV NODE_ENV=production PORT=3000 DATA_DIR=/data
USER node
EXPOSE 3000
HEALTHCHECK --interval=20s --timeout=4s --start-period=10s CMD node -e "fetch('http://127.0.0.1:3000/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node","server/index.mjs"]

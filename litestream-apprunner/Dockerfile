FROM node:18.3.0
COPY . .
ADD https://github.com/benbjohnson/litestream/releases/download/v0.3.8/litestream-v0.3.8-linux-amd64.deb .
RUN dpkg -i litestream-v0.3.8-linux-amd64.deb && \
  rm litestream-v0.3.8-linux-amd64.deb && \
  apt-get update && \
  apt-get install -y sqlite && \
  corepack enable pnpm && \
  pnpm i --prod=false && \
  pnpm exec prisma generate && \
  pnpm run build
COPY litestream.yml /etc/litestream.yml
CMD ["litestream", "replicate", "-exec", "node dist/main"]
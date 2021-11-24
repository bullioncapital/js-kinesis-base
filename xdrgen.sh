#!/bin/bash
# generate xdr source code from xdr files
# ------------------
# gem install bundler:2.2.25 && bundle install
# yarn install && yarn run xdr
# exit
RAKE_IMAGE=rake:dev
if [[ "$(docker images -q ${RAKE_IMAGE} 2> /dev/null)" == "" ]]; then
cat <<EOF | docker build -t ${RAKE_IMAGE} -f - .
FROM ruby:2.7

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

RUN curl -sL https://deb.nodesource.com/setup_14.x | bash -\
  && apt-get update -qq && apt-get install -qq --no-install-recommends \
    nodejs \
  && apt-get upgrade -qq \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*\
  && npm install -g yarn@1
EOF
fi
docker run --rm -it \
    -v "$PWD":/working \
    -w /working \
    --entrypoint bash \
    $RAKE_IMAGE

# reset file permission
sudo chown $USER src/generated/stellar-xdr_generated.js

# git clone https://github.com/stellar/dts-xdr
# cd dts-xdr
# npm install
# OUT=stellar-xdr_generated.d.ts npx jscodeshift -t src/transform.js ../src/generated/stellar-xdr_generated.js
# cp stellar-xdr_generated.d.ts ../types/xdr.d.ts
# cd .. && rm -rf dts-xdr
# yarn run prettier --write types/xdr.d.ts


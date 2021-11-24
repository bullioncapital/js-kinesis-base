#!/bin/bash
# generate xdr source code from xdr files
# ------------------
# gem install bundler:2.2.25
# bundle install
# rake xdr:generate
# exit
docker run --rm -it \
    -v "$PWD":/working \
    -w /working \
    --entrypoint bash \
    ruby:2.7.4-buster

# reset file permission
sudo chown $USER src/generated/stellar-xdr_generated.js
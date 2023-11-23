describe('TransactionEnvelope', function() {
  it('can successfully decode an envelope', function(done) {
    // from https://github.com/stellar/js-stellar-sdk/issues/73
    let xdr =
      'AAAAAEtl2k+Vx6bLH0iiP9boT+j4e7m/uApHLEaX9zulHmVBAAAAAB2BGiQAAAAAAAAAAQAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAEahxdpkSFx+yLaWqZI2+YaIsdmw4ruszEbDYiccAQ20AAAAAEGQqwAAAAAAAAAAAaUeZUEAAABAVrCFJvyzHb+YicyrvIo0axh61qaXapPTQxmraykhg8APE3TVTQyS+t8SR0LF2CfDKjLk4Xl2GRhIztXZlEYqBw==';

    let txe = StellarBase.xdr.TransactionEnvelope.fromXDR(
      xdr,
      'base64'
    ).value();
    let sourceAccount = txe.tx().sourceAccountEd25519();

    expect(sourceAccount.length).to.be.equal(32);
    done();
  });

  it('calculates correct hash with non-utf8 strings', function(done) {
    // ef1607183c06e41dd3291de61fd562dc6f342a73d3fe4fabf5229937fea1a065
    let xdr =
      'AAAAAEtl2k+Vx6bLH0iiP9boT+j4e7m/uApHLEaX9zulHmVBAAAAAB2BGiQAAAAAAAAAAQAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAEahxdpkSFx+yLaWqZI2+YaIsdmw4ruszEbDYiccAQ20AAAAAEGQqwAAAAAAAAAAAaUeZUEAAABAVrCFJvyzHb+YicyrvIo0axh61qaXapPTQxmraykhg8APE3TVTQyS+t8SR0LF2CfDKjLk4Xl2GRhIztXZlEYqBw==';
    var tx = new StellarBase.Transaction(xdr, StellarBase.Networks.PUBLIC);
    expect(tx.hash().toString('hex')).to.be.equal(
      'ef1607183c06e41dd3291de61fd562dc6f342a73d3fe4fabf5229937fea1a065'
    );
    done();
  });
});

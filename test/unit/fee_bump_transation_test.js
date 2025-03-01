import randomBytes from 'randombytes';
import { encodeMuxedAccountToAddress } from '../../src/util/decode_encode_muxed_account';

describe('FeeBumpTransaction', function () {
  beforeEach(function () {
    this.baseFee = '100';
    this.networkPassphrase = 'Standalone Network ; February 2017';
    this.innerSource = StellarBase.Keypair.master(this.networkPassphrase);
    this.innerAccount = new StellarBase.Account(
      this.innerSource.publicKey(),
      '7'
    );
    this.destination =
      'GDQERENWDDSQZS7R7WKHZI3BSOYMV3FSWR7TFUYFTKQ447PIX6NREOJM';
    this.amount = '2000.0000000';
    this.asset = StellarBase.Asset.native();

    this.innerTx = new StellarBase.TransactionBuilder(this.innerAccount, {
      fee: '100',
      networkPassphrase: this.networkPassphrase,
      timebounds: {
        minTime: 0,
        maxTime: 0
      }
    })
      .addOperation(
        StellarBase.Operation.payment({
          destination: this.destination,
          asset: this.asset,
          amount: this.amount
        })
      )
      .addMemo(StellarBase.Memo.text('Happy birthday!'))
      .build();
    this.innerTx.sign(this.innerSource);
    this.feeSource = StellarBase.Keypair.fromSecret(
      'SB7ZMPZB3YMMK5CUWENXVLZWBK4KYX4YU5JBXQNZSK2DP2Q7V3LVTO5V'
    );
    this.transaction = StellarBase.TransactionBuilder.buildFeeBumpTransaction(
      this.feeSource,
      '100',
      this.innerTx,
      this.networkPassphrase
    );
  });

  it('constructs a FeeBumpTransaction object from a TransactionEnvelope', function () {
    const transaction = this.transaction;
    transaction.sign(this.feeSource);

    expect(transaction.feeSource).to.be.equal(this.feeSource.publicKey());
    // expect(transaction.fee).to.be.equal('200');

    const innerTransaction = transaction.innerTransaction;

    expect(innerTransaction.toXDR()).to.be.equal(this.innerTx.toXDR());
    expect(innerTransaction.source).to.be.equal(this.innerSource.publicKey());
    expect(innerTransaction.fee).to.be.equal('100');
    expect(innerTransaction.memo.type).to.be.equal(StellarBase.MemoText);
    expect(innerTransaction.memo.value.toString('ascii')).to.be.equal(
      'Happy birthday!'
    );
    const operation = innerTransaction.operations[0];
    expect(operation.type).to.be.equal('payment');
    expect(operation.destination).to.be.equal(this.destination);
    expect(operation.amount).to.be.equal(this.amount);

    const expectedXDR =
      'AAAABQAAAADgSJG2GOUMy/H9lHyjYZOwyuyytH8y0wWaoc596L+bEgAAAAAAAABkAAAAAgAAAABzdv3ojkzWHMD7KUoXhrPx0GH18vHKV0ZfqpMiEblG1gAAAAAAAABkAAAAAAAAAAgAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAPSGFwcHkgYmlydGhkYXkhAAAAAAEAAAAAAAAAAQAAAADgSJG2GOUMy/H9lHyjYZOwyuyytH8y0wWaoc596L+bEgAAAAAAAAAEqBfIAAAAAAAAAAABEblG1gAAAECu6ENUJQ06njC7mcN78Y3CJvJfFEg07EpVVVDP+gm3FO4ijzrAaGXR6otHdCnpQpcC/LieBH1tgViW9lBsCP4JAAAAAAAAAAHov5sSAAAAQM4DUSgwk4xOYxktxCJ5qtxErB+FTNhKQ+INXnenLkulSnTdim/sUb5m1nLW5sgg5Ew6iRyOb8kd57hEVcaFLQg=';

    expect(transaction.toEnvelope().toXDR().toString('base64')).to.be.equal(
      expectedXDR
    );
    const expectedTxEnvelope = StellarBase.xdr.TransactionEnvelope.fromXDR(
      expectedXDR,
      'base64'
    ).value();

    expect(innerTransaction.source).to.equal(
      StellarBase.StrKey.encodeEd25519PublicKey(
        expectedTxEnvelope.tx().innerTx().value().tx().sourceAccount().ed25519()
      )
    );
    expect(transaction.feeSource).to.equal(
      StellarBase.StrKey.encodeEd25519PublicKey(
        expectedTxEnvelope.tx().feeSource().ed25519()
      )
    );

    expect(transaction.innerTransaction.fee).to.equal(
      expectedTxEnvelope.tx().innerTx().value().tx().fee().toString()
    );
    expect(transaction.fee).to.equal(expectedTxEnvelope.tx().fee().toString());

    expect(innerTransaction.signatures.length).to.equal(1);
    expect(innerTransaction.signatures[0].toXDR().toString('base64')).to.equal(
      expectedTxEnvelope
        .tx()
        .innerTx()
        .value()
        .signatures()[0]
        .toXDR()
        .toString('base64')
    );

    expect(transaction.signatures.length).to.equal(1);
    expect(transaction.signatures[0].toXDR().toString('base64')).to.equal(
      expectedTxEnvelope.signatures()[0].toXDR().toString('base64')
    );
  });

  it('throws when a garbage Network is selected', function () {
    const input = this.transaction.toEnvelope();

    expect(() => {
      new StellarBase.FeeBumpTransaction(input, { garbage: 'yes' });
    }).to.throw(/expected a string/);

    expect(() => {
      new StellarBase.FeeBumpTransaction(input, 1234);
    }).to.throw(/expected a string/);
  });

  it('signs correctly', function () {
    const tx = this.transaction;
    tx.sign(this.feeSource);
    const rawSig = tx.toEnvelope().feeBump().signatures()[0].signature();
    expect(this.feeSource.verify(tx.hash(), rawSig)).to.equal(true);
  });

  it('signs using hash preimage', function () {
    let preimage = randomBytes(64);
    let hash = StellarBase.hash(preimage);
    let tx = this.transaction;
    tx.signHashX(preimage);
    let env = tx.toEnvelope().feeBump();
    expectBuffersToBeEqual(env.signatures()[0].signature(), preimage);
    expectBuffersToBeEqual(
      env.signatures()[0].hint(),
      hash.slice(hash.length - 4)
    );
  });

  it('returns error when signing using hash preimage that is too long', function () {
    let preimage = randomBytes(2 * 64);
    let tx = this.transaction;
    expect(() => tx.signHashX(preimage)).to.throw(
      /preimage cannnot be longer than 64 bytes/
    );
  });

  describe('toEnvelope', function () {
    it('does not return a reference to source signatures', function () {
      const transaction = this.transaction;
      const envelope = transaction.toEnvelope().value();
      envelope.signatures().push({});

      expect(transaction.signatures.length).to.equal(0);
    });

    // do not manipulate fee
    xit('does not return a reference to the source transaction', function () {
      const transaction = this.transaction;
      const envelope = transaction.toEnvelope().value();
      envelope.tx().fee(StellarBase.xdr.Int64.fromString('300'));

      expect(transaction.tx.fee().toString()).to.equal('200');
    });
  });

  it('adds signature correctly', function () {
    const transaction = this.transaction;
    const signer = this.feeSource;
    const presignHash = transaction.hash();

    const addedSignatureTx = new StellarBase.FeeBumpTransaction(
      transaction.toEnvelope(),
      this.networkPassphrase
    );

    const signature = signer.sign(presignHash).toString('base64');

    addedSignatureTx.addSignature(signer.publicKey(), signature);

    const envelopeAddedSignature = addedSignatureTx.toEnvelope().feeBump();

    expect(
      signer.verify(
        addedSignatureTx.hash(),
        envelopeAddedSignature.signatures()[0].signature()
      )
    ).to.equal(true);

    transaction.sign(signer);
    const envelopeSigned = transaction.toEnvelope().feeBump();

    expectBuffersToBeEqual(
      envelopeSigned.signatures()[0].signature(),
      envelopeAddedSignature.signatures()[0].signature()
    );

    expectBuffersToBeEqual(
      envelopeSigned.signatures()[0].hint(),
      envelopeAddedSignature.signatures()[0].hint()
    );

    expectBuffersToBeEqual(addedSignatureTx.hash(), transaction.hash());
  });

  it('adds signature generated by getKeypairSignature', function () {
    const transaction = this.transaction;
    const presignHash = transaction.hash();
    const signer = this.feeSource;

    const signature = new StellarBase.FeeBumpTransaction(
      transaction.toEnvelope(),
      this.networkPassphrase
    ).getKeypairSignature(signer);

    expect(signer.sign(presignHash).toString('base64')).to.equal(signature);

    const addedSignatureTx = new StellarBase.FeeBumpTransaction(
      transaction.toEnvelope(),
      this.networkPassphrase
    );

    expect(addedSignatureTx.signatures.length).to.equal(0);
    addedSignatureTx.addSignature(signer.publicKey(), signature);

    const envelopeAddedSignature = addedSignatureTx.toEnvelope().feeBump();

    expect(
      signer.verify(
        transaction.hash(),
        envelopeAddedSignature.signatures()[0].signature()
      )
    ).to.equal(true);

    expect(transaction.signatures.length).to.equal(0);
    transaction.sign(signer);
    const envelopeSigned = transaction.toEnvelope().feeBump();

    expectBuffersToBeEqual(
      envelopeSigned.signatures()[0].signature(),
      envelopeAddedSignature.signatures()[0].signature()
    );

    expectBuffersToBeEqual(
      envelopeSigned.signatures()[0].hint(),
      envelopeAddedSignature.signatures()[0].hint()
    );

    expectBuffersToBeEqual(addedSignatureTx.hash(), transaction.hash());
  });

  it('does not add invalid signature', function () {
    const transaction = this.transaction;
    const signer = this.feeSource;

    const signature = new StellarBase.FeeBumpTransaction(
      transaction.toEnvelope(),
      this.networkPassphrase
    ).getKeypairSignature(signer);

    const alteredTx = StellarBase.TransactionBuilder.buildFeeBumpTransaction(
      this.feeSource,
      '200',
      this.innerTx,
      this.networkPassphrase
    );

    expect(() => {
      alteredTx.addSignature(signer.publicKey(), signature);
    }).to.throw('Invalid signature');
  });

  it('outputs xdr as a string', function () {
    const xdrString =
      'AAAABQAAAADgSJG2GOUMy/H9lHyjYZOwyuyytH8y0wWaoc596L+bEgAAAAAAAADIAAAAAgAAAABzdv3ojkzWHMD7KUoXhrPx0GH18vHKV0ZfqpMiEblG1gAAAAAAAABkAAAAAAAAAAgAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAPSGFwcHkgYmlydGhkYXkhAAAAAAEAAAAAAAAAAQAAAADgSJG2GOUMy/H9lHyjYZOwyuyytH8y0wWaoc596L+bEgAAAAAAAAAEqBfIAAAAAAAAAAABEblG1gAAAECu6ENUJQ06njC7mcN78Y3CJvJfFEg07EpVVVDP+gm3FO4ijzrAaGXR6otHdCnpQpcC/LieBH1tgViW9lBsCP4JAAAAAAAAAAHov5sSAAAAQFbk0woeHJGOJa2ZpVoIOQoEAPVcDZ7ycTantXxqNkPqRP99hnCXyWN8bQY/bnfmIYspvO3vyqsIXUe0Ee/09Qg=';
    const transaction = new StellarBase.FeeBumpTransaction(
      xdrString,
      this.networkPassphrase
    );
    expect(transaction).to.be.instanceof(StellarBase.FeeBumpTransaction);
    expect(transaction.toXDR()).to.be.equal(xdrString);
  });

  it('decodes muxed addresses correctly', function () {
    const muxedFeeSource = this.feeSource.xdrMuxedAccount('0');
    const muxedAddress = encodeMuxedAccountToAddress(muxedFeeSource);

    const envelope = this.transaction.toEnvelope();
    envelope.feeBump().tx().feeSource(muxedFeeSource);

    const txWithMuxedAccount = new StellarBase.FeeBumpTransaction(
      envelope,
      this.networkPassphrase
    );
    expect(txWithMuxedAccount.feeSource).to.equal(muxedAddress);
  });
});

function expectBuffersToBeEqual(left, right) {
  let leftHex = left.toString('hex');
  let rightHex = right.toString('hex');
  expect(leftHex).to.eql(rightHex);
}

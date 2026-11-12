# merkle-tree-auditor Spec Sources

## Normative

- The target's own tree specification (protocol spec, circuit documentation,
  or contract NatSpec). Normative for depth, arity, leaf encoding, empty
  value, and index-bit order; an implementation with no written tree
  definition is reviewed against the properties in the checklist.
- RFC 6962, "Certificate Transparency", §2.1 (Merkle Hash Trees), and its
  successor RFC 9162. The reference construction for leaf/node separation
  (0x00 leaf prefix, 0x01 node prefix), unbalanced trees without node
  duplication, audit paths, and consistency proofs.
- Ethereum consensus specifications: SSZ Merkleization,
  `is_valid_merkle_branch`, and the deposit contract's incremental tree.
  Normative when the target verifies beacon-chain or deposit proofs; also
  the common reference for frontier-based append-only trees.
- Zcash Protocol Specification, sections on the note commitment tree and
  Merkle path validity. Normative for fixed-depth incremental commitment
  trees with a defined uncommitted-leaf value.
- The hash function's own specification, for the compression function used
  at leaves and nodes. Parameter questions belong to `hash-function-auditor`.

## Informative

- Merkle, "A Digital Signature Based on a Conventional Encryption Function"
  (CRYPTO 1987): the original construction.
- CVE-2012-2459 (Bitcoin): duplicate-last-node padding lets two transaction
  lists share a root. The reference incident for P2.
- Lerner, "Leaf-Node weakness in Bitcoin Merkle Tree Design" (2018;
  CVE-2017-12842): 64-byte transactions interpreted as internal nodes;
  motivates P1.
- OpenZeppelin Contracts `MerkleProof` documentation: sorted-pair hashing,
  the warning against 64-byte leaves, and the 2023 multiproof security
  advisory (GHSA-wprv-93r4-jj2p, CVE-2023-34459; fixed in v4.9.2);
  calibration for P1, P4, and P7.
- Dahlberg, Pulls, Peeters, "Efficient Sparse Merkle Trees: Caching
  Strategies and Secure (Non-)Membership Proofs" (NordSec 2016): sparse tree
  defaults and non-membership proofs.
- Tzialla, Kothapalli, Parno, Setty, "Transparency Dictionaries with
  Succinct Proofs of Correct Operation" (NDSS 2022) and the Aztec
  documentation on indexed Merkle trees: low-leaf non-membership proofs.
- Tornado Cash `MerkleTreeWithHistory`: the widely copied incremental tree
  with a root-history ring buffer and an empty-leaf constant derived from
  `keccak256("tornado")`, so that no opening of it is known.
- Todd, "Merkle Mountain Ranges" (OpenTimestamps documentation): the MMR
  structure and bagging the peaks into one digest.

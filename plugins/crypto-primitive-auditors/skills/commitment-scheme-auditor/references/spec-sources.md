# commitment-scheme-auditor Spec Sources

## Normative

- Kate, Zaverucha, Goldberg — "Constant-Size Commitments to Polynomials
  and Their Applications" (ASIACRYPT 2010): KZG commitment, opening
  equation, and the binding assumption tied to the SRS.
- Gabizon, Williamson, Ciobotaru — "PLONK" (ePrint 2019/953), and Boneh,
  Drake, Fisch, Gabizon — "Efficient polynomial commitment schemes for
  multiple points and polynomials" (ePrint 2020/081): the batched KZG
  opening schemes most verifiers implement; govern the batch equation.
- Ben-Sasson, Bentov, Horesh, Riabzev — "Fast Reed-Solomon Interactive
  Oracle Proofs of Proximity" (ICALP 2018): FRI folding and query phase.
- Ben-Sasson, Carmon, Ishai, Kopparty, Saraf — "Proximity Gaps for
  Reed-Solomon Codes" (FOCS 2020): proven soundness regimes for FRI and
  batched FRI. Its up-to-capacity conjecture is disproved (see Informative).
- StarkWare — "ethSTARK Documentation" (ePrint 2021/582): conjectured
  security accounting, grinding, and the caps from field and hash size.
- Bünz, Bootle, Boneh, Poelstra, Wuille, Maxwell — "Bulletproofs" (IEEE
  S&P 2018), and Bowe, Grigg, Hopwood — "Recursive Proof Composition
  without a Trusted Setup" (Halo): inner product argument and its use as a
  polynomial commitment opening.
- Pedersen — "Non-Interactive and Information-Theoretic Secure Verifiable
  Secret Sharing" (CRYPTO 1991): Pedersen commitment binding and hiding.
- RFC 9380 — "Hashing to Elliptic Curves": the accepted way to derive
  generators with no known discrete-log relation.
- The target's own protocol specification for parameter sets (SRS size,
  blowup, queries, grinding) and its stated security level.

## Informative

- Bowe, Gabizon, Miers — "Scalable Multi-party Computation for zk-SNARK
  Parameters in the Random Beacon Model": powers-of-tau ceremony checks.
- Nikolaenko, Ragsdale, Bonneau, Boneh — "Powers-of-Tau to the People":
  SRS well-formedness checks a verifier of the setup performs.
- Chiesa, Hu, Maller, Mishra, Vesely, Ward — "Marlin" (EUROCRYPT 2020):
  degree-bound enforcement on top of KZG.
- Ben-Sasson, Goldberg, Kopparty, Saraf — "DEEP-FRI" (ITCS 2020), and
  Haböck — "A summary on the FRI low degree test" (ePrint 2022/1216):
  out-of-domain quotienting and a consolidated soundness analysis.
- Diamond, Gruen — "On the Distribution of the Distances of Random Words"
  (ePrint 2025/2010), and Crites, Stewart — "On Reed-Solomon Proximity
  Gaps Conjectures" (ePrint 2025/2046): the up-to-capacity proximity-gap
  and list-decodability conjectures behind conjectured-regime FRI
  accounting are false as stated.
- Block, Garreta, Katz, Thaler, Tiwari, Zając — "Fiat-Shamir Security of
  FRI and Related SNARKs" (ASIACRYPT 2023): non-interactive FRI bounds.
- Ethereum consensus specs, Deneb polynomial-commitments, and EIP-4844:
  KZG as deployed for blobs; application usage is owned by
  `ethereum-crypto-auditor`.

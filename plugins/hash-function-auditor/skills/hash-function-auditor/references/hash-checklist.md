# Hash Function Audit Checklist

## Parameter selection

- [ ] Poseidon/Rescue/MiMC parameters match claimed security target
- [ ] Round constants are derived from nothing-up-my-sleeve seed with provenance
- [ ] Full and partial rounds provide margin against known attacks

## Sponge construction

- [ ] Sponge capacity >= 2 * security_level bits
- [ ] Absorption rate and squeezing behavior are implemented correctly
- [ ] Padding and block boundaries are unambiguous

## Domain separation

- [ ] Different protocol contexts use unique prefixes/tags
- [ ] Merkle hashing and transcript hashing are separated
- [ ] Field element encoding is canonical before hashing

## Algebraic attack resistance

- [ ] Round count covers interpolation/Grobner/differential risks
- [ ] MDS matrix has expected dimension and no invariant subspaces
- [ ] S-box exponent is compatible with field structure and security assumptions

## MDS matrix

- [ ] MDS matrix is invertible and matches specification
- [ ] Matrix generation process is documented and reproducible

## S-box exponent

- [ ] Poseidon exponent is coprime to p-1
- [ ] Rescue exponent/cube choices match design assumptions

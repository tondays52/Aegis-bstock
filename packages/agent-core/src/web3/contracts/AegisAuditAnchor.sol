// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AegisAuditAnchor
 * @dev On-chain immutable cryptographic audit anchor for Aegis-bStock autonomous trading agents on BNB Smart Chain.
 * Enables zero-knowledge / Merkle-verifiable decision lineage for hackathon judges, auditors, and regulators.
 */
contract AegisAuditAnchor {
    struct AuditBatch {
        bytes32 merkleRoot;
        uint256 totalDecisions;
        uint256 timestamp;
        string agentCommitSha;
        address committedBy;
    }

    address public owner;
    AuditBatch[] public batches;

    event AuditAnchorCommitted(
        uint256 indexed batchIndex,
        bytes32 indexed merkleRoot,
        uint256 totalDecisions,
        uint256 timestamp,
        string agentCommitSha,
        address committedBy
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "AegisAuditAnchor: caller is not the owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Commits a cryptographic Merkle root representing an immutable batch of decision receipts.
     */
    function commitAuditBatch(
        bytes32 _merkleRoot,
        uint256 _totalDecisions,
        string calldata _agentCommitSha
    ) external returns (uint256 batchIndex) {
        batchIndex = batches.length;
        
        batches.push(AuditBatch({
            merkleRoot: _merkleRoot,
            totalDecisions: _totalDecisions,
            timestamp: block.timestamp,
            agentCommitSha: _agentCommitSha,
            committedBy: msg.sender
        }));

        emit AuditAnchorCommitted(
            batchIndex,
            _merkleRoot,
            _totalDecisions,
            block.timestamp,
            _agentCommitSha,
            msg.sender
        );
    }

    /**
     * @notice Returns total number of committed audit batches.
     */
    function getBatchesCount() external view returns (uint256) {
        return batches.length;
    }

    /**
     * @notice Retrieves batch details by index.
     */
    function getBatch(uint256 _index) external view returns (AuditBatch memory) {
        require(_index < batches.length, "AegisAuditAnchor: batch index out of bounds");
        return batches[_index];
    }

    /**
     * @notice Verifies whether a specific receipt hash belongs to an on-chain anchored Merkle root.
     */
    function verifyReceiptInBatch(
        uint256 _batchIndex,
        bytes32 _leafHash,
        bytes32[] calldata _merkleProof
    ) external view returns (bool) {
        require(_batchIndex < batches.length, "AegisAuditAnchor: batch index out of bounds");
        bytes32 computedHash = _leafHash;

        for (uint256 i = 0; i < _merkleProof.length; i++) {
            bytes32 proofElement = _merkleProof[i];
            if (computedHash <= proofElement) {
                computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
            } else {
                computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
            }
        }

        return computedHash == batches[_batchIndex].merkleRoot;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IERC8004ValidationRegistry
 * @dev ERC-8004 Validation Registry Interface
 * Standard interface for requesting and recording agent validations
 *
 * Specification: https://eips.ethereum.org/EIPS/eip-8004
 */
interface IERC8004ValidationRegistry {
    /**
     * @dev Emitted when an agent requests validation
     * @param agentValidatorId ID of the validator performing validation
     * @param agentServerId ID of the agent being validated
     * @param dataHash Hash committing to job information (input/output or attestation proof)
     */
    event ValidationRequest(
        bytes32 indexed agentValidatorId,
        bytes32 indexed agentServerId,
        bytes32 dataHash
    );

    /**
     * @dev Emitted when validation response is recorded
     * @param agentValidatorId ID of the validator
     * @param agentServerId ID of the agent
     * @param dataHash Hash of validated data
     * @param response Validation score (0-100)
     */
    event ValidationResponse(
        bytes32 indexed agentValidatorId,
        bytes32 indexed agentServerId,
        bytes32 dataHash,
        uint8 response
    );

    /**
     * @dev Request validation for an agent
     * @param agentValidatorId ID of the validator to use
     * @param agentServerId ID of the agent requesting validation
     * @param dataHash Hash of the data to validate
     */
    function requestValidation(
        bytes32 agentValidatorId,
        bytes32 agentServerId,
        bytes32 dataHash
    ) external payable;

    /**
     * @dev Submit validation response
     * @param dataHash Hash of the validated data
     * @param response Validation score (0-100)
     * Requirements:
     * - dataHash must be in contract memory (from previous ValidationRequest)
     * - Only authorized validators can submit responses
     */
    function submitValidationResponse(
        bytes32 dataHash,
        uint8 response
    ) external;

    /**
     * @dev Get validation status
     * @param agentServerId ID of the agent
     * @param dataHash Hash of the data
     * @return validated Whether validation was completed
     * @return response Validation score (0 if not validated)
     */
    function getValidationStatus(
        bytes32 agentServerId,
        bytes32 dataHash
    ) external view returns (bool validated, uint8 response);
}

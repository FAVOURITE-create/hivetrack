# HiveTrack DAO Progress Tracker

A decentralized DAO tool for transparent community progress tracking on the Stacks blockchain.

## Project Overview

HiveTrack is a Clarity smart contract project that provides a decentralized platform for DAO (Decentralized Autonomous Organization) members to log and track their progress on various tasks and initiatives. The contract allows registered members to submit progress entries with details like descriptions, categories, proof links, and tags. The contract also supports member registration, ownership transfer, and member deactivation features to ensure proper governance and control over the DAO's progress tracking.

## Contract Architecture

The HiveTrack DAO Progress Tracker contract is structured around the following key components:

### Data Structures
- `dao-members`: A map that stores registered DAO members, their active status, join timestamp, and member type (e.g., "contributor", "core").
- `progress-entries`: A map that stores the details of logged progress entries, including the contributor, description, category, timestamp, proof link, and tags.
- `total-progress-entries`: A data variable that keeps track of the total number of progress entries.

### Public Functions
- `register-member`: Allows the contract owner to register new DAO members with an optional member type.
- `log-progress-with-validation`: Enables registered DAO members to log progress entries with input validation, including checks for valid description, category, and proof link format.
- `get-progress-entry`: Retrieves the details of a specific progress entry.
- `get-total-progress-entries`: Returns the total number of progress entries.
- `transfer-ownership`: Allows the current contract owner to transfer ownership to a new principal.
- `deactivate-member`: Enables the contract owner to deactivate a registered DAO member.

### Authorization and Security
- The contract includes an `is-contract-owner` function to ensure that only the contract owner can perform administrative actions.
- The `is-member` and `is-member-of-type` functions are used to check if a principal is a registered and active DAO member.
- Input validation is performed for various fields, such as description length, category length, and proof link format, to ensure data integrity.

## Installation & Setup

Prerequisites:
- Clarinet: A Clarity smart contract development tool for the Stacks blockchain.

Installation steps:
1. Install Clarinet: Follow the official Clarinet installation guide for your platform.
2. Clone the HiveTrack repository: `git clone https://github.com/your-username/hivetrack.git`
3. Change to the project directory: `cd hivetrack`
4. Initialize the Clarinet project: `clarinet init`

Configuration:
The Clarinet configuration file (`Clarinet.toml`) is located in the project root directory. Update the file with your desired settings, such as the network to use (Devnet, Testnet, or Mainnet).

## Usage Guide

### Registering a New DAO Member
To register a new DAO member as a "contributor":

```clarity
(contract-call? 'hive_progress_tracker register-member "contributor")
```

This function call will register the current transaction sender as a new DAO member with the "contributor" member type.

### Logging Progress
Registered DAO members can log their progress using the `log-progress-with-validation` function:

```clarity
(contract-call? 'hive_progress_tracker log-progress-with-validation
  "Completed feature X"
  "development"
  (some "https://example.com/proof")
  (list "feature" "frontend")
)
```

This will create a new progress entry with the specified description, category, proof link, and tags.

### Retrieving Progress Entries
To get the details of a specific progress entry:

```clarity
(contract-call? 'hive_progress_tracker get-progress-entry 0)
```

This will return the details of the progress entry with the ID 0.

To get the total number of progress entries:

```clarity
(contract-call? 'hive_progress_tracker get-total-progress-entries)
```

## Testing

The HiveTrack DAO Progress Tracker contract includes a comprehensive test suite built using the Clarinet testing framework. The tests cover the following key scenarios:

- Successful member registration by the contract owner
- Preventing unauthorized member registration
- Preventing duplicate member registrations
- Preventing invalid member type registration
- Successful progress logging by a registered member
- Preventing progress logging by a non-member
- Validating input constraints for progress entry fields
- Retrieving progress entries and validating the total entries counter
- Transferring contract ownership to a new owner
- Deactivating a registered member
- Validating proof link input for progress logging
- Preventing transfer of ownership to the same address

To run the tests, execute the following command in the project directory:

```
clarinet test
```

## Security Considerations

The HiveTrack DAO Progress Tracker contract includes several security measures to ensure the integrity and proper functioning of the progress tracking system:

1. **Authorization Checks**: The contract uses the `is-contract-owner` function to ensure that only the contract owner can perform administrative actions, such as registering new members and transferring ownership.
2. **Member Validation**: The `is-member` and `is-member-of-type` functions are used to verify that a principal is a registered and active DAO member before allowing them to log progress entries.
3. **Input Validation**: The contract performs extensive input validation for various fields, including description length, category length, and proof link format, to ensure data integrity and prevent malicious or invalid entries.
4. **Ownership Transfer**: The `transfer-ownership` function allows the current contract owner to securely transfer ownership to a new principal, ensuring proper governance of the DAO.
5. **Member Deactivation**: The `deactivate-member` function enables the contract owner to deactivate a registered DAO member, providing a way to revoke access if necessary.

By implementing these security measures, the HiveTrack DAO Progress Tracker contract aims to maintain a secure and transparent progress tracking system for the DAO community.

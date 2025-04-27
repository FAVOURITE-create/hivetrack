import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.2/index.ts';
import { assertEquals } from 'https://deno.land/std@0.170.0/testing/asserts.ts';

Clarinet.test({
  name: "Ensure contract owner can register a member with valid member type",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const member = accounts.get('wallet_1')!;

    // Register a new member as a contributor
    let block = chain.mineBlock([
      Tx.contractCall('hive_progress_tracker', 'register-member', 
        [types.ascii('contributor')], 
        deployer.address)
    ]);

    // Check transaction result
    block.receipts[0].result.expectOk().expectBool(true);

    // Verify member is registered
    let isContributor = chain.callReadOnlyFn(
      'hive_progress_tracker', 
      'is-member-of-type', 
      [types.principal(deployer.address), types.ascii('contributor')], 
      deployer.address
    );
    isContributor.result.expectBool(true);
  }
});

Clarinet.test({
  name: "Prevent unauthorized member registration",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const member = accounts.get('wallet_1')!;

    // Try to register a member by a non-owner
    let block = chain.mineBlock([
      Tx.contractCall('hive_progress_tracker', 'register-member', 
        [types.ascii('contributor')], 
        member.address)
    ]);

    // Check transaction result (should fail)
    block.receipts[0].result.expectErr().expectUint(401);
  }
});

Clarinet.test({
  name: "Prevent duplicate member registrations",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    // First registration (should succeed)
    let block = chain.mineBlock([
      Tx.contractCall('hive_progress_tracker', 'register-member', 
        [types.ascii('contributor')], 
        deployer.address)
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    // Second registration of the same member (should fail)
    block = chain.mineBlock([
      Tx.contractCall('hive_progress_tracker', 'register-member', 
        [types.ascii('contributor')], 
        deployer.address)
    ]);
    block.receipts[0].result.expectErr().expectUint(403);
  }
});

Clarinet.test({
  name: "Prevent invalid member type registration",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    // Try to register with an invalid member type
    let block = chain.mineBlock([
      Tx.contractCall('hive_progress_tracker', 'register-member', 
        [types.ascii('invalid-type')], 
        deployer.address)
    ]);

    // Check transaction result (should fail)
    block.receipts[0].result.expectErr().expectUint(404);
  }
});

Clarinet.test({
  name: "Successful progress logging by registered member",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    // First, register the member
    let block = chain.mineBlock([
      Tx.contractCall('hive_progress_tracker', 'register-member', 
        [types.ascii('contributor')], 
        deployer.address)
    ]);

    // Log a progress entry
    block = chain.mineBlock([
      Tx.contractCall('hive_progress_tracker', 'log-progress-with-validation', 
        [
          types.utf8('Completed feature X'),
          types.ascii('development'),
          types.some(types.utf8('https://example.com/proof')),
          types.list([types.ascii('feature'), types.ascii('frontend')])
        ], 
        deployer.address)
    ]);

    // Check transaction result
    block.receipts[0].result.expectOk();

    // Verify total progress entries increased
    let totalEntries = chain.callReadOnlyFn(
      'hive_progress_tracker', 
      'get-total-progress-entries', 
      [], 
      deployer.address
    );
    totalEntries.result.expectUint(1);
  }
});

Clarinet.test({
  name: "Prevent progress logging by non-members",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const nonMember = accounts.get('wallet_1')!;

    // Try to log progress without being a member
    let block = chain.mineBlock([
      Tx.contractCall('hive_progress_tracker', 'log-progress', 
        [
          types.utf8('Completed feature X'),
          types.ascii('development'),
          types.none(),
          types.list([types.ascii('feature'), types.ascii('frontend')])
        ], 
        nonMember.address)
    ]);

    // Check transaction result (should fail)
    block.receipts[0].result.expectErr().expectUint(401);
  }
});

Clarinet.test({
  name: "Validate progress entry input constraints",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    // First, register the member
    let block = chain.mineBlock([
      Tx.contractCall('hive_progress_tracker', 'register-member', 
        [types.ascii('contributor')], 
        deployer.address)
    ]);

    // Test invalid description (empty)
    block = chain.mineBlock([
      Tx.contractCall('hive_progress_tracker', 'log-progress', 
        [
          types.utf8(''),
          types.ascii('development'),
          types.none(),
          types.list([types.ascii('feature'), types.ascii('frontend')])
        ], 
        deployer.address)
    ]);
    block.receipts[0].result.expectErr().expectUint(404);

    // Test invalid description (too long)
    block = chain.mineBlock([
      Tx.contractCall('hive_progress_tracker', 'log-progress', 
        [
          types.utf8('a'.repeat(501)),
          types.ascii('development'),
          types.none(),
          types.list([types.ascii('feature'), types.ascii('frontend')])
        ], 
        deployer.address)
    ]);
    block.receipts[0].result.expectErr().expectUint(404);

    // Test invalid category 
    block = chain.mineBlock([
      Tx.contractCall('hive_progress_tracker', 'log-progress', 
        [
          types.utf8('Completed feature X'),
          types.ascii(''),
          types.none(),
          types.list([types.ascii('feature'), types.ascii('frontend')])
        ], 
        deployer.address)
    ]);
    block.receipts[0].result.expectErr().expectUint(404);

    // Test too many tags
    block = chain.mineBlock([
      Tx.contractCall('hive_progress_tracker', 'log-progress', 
        [
          types.utf8('Completed feature X'),
          types.ascii('development'),
          types.none(),
          types.list([
            types.ascii('tag1'), 
            types.ascii('tag2'), 
            types.ascii('tag3'), 
            types.ascii('tag4'), 
            types.ascii('tag5'), 
            types.ascii('tag6')
          ])
        ], 
        deployer.address)
    ]);
    block.receipts[0].result.expectErr().expectUint(404);
  }
});

Clarinet.test({
  name: "Retrieve progress entries and validate total entries counter",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    // Register member
    let block = chain.mineBlock([
      Tx.contractCall('hive_progress_tracker', 'register-member', 
        [types.ascii('contributor')], 
        deployer.address)
    ]);

    // Log multiple progress entries
    block = chain.mineBlock([
      Tx.contractCall('hive_progress_tracker', 'log-progress-with-validation', 
        [
          types.utf8('Completed feature X'),
          types.ascii('development'),
          types.some(types.utf8('https://example.com/proof')),
          types.list([types.ascii('feature'), types.ascii('frontend')])
        ], 
        deployer.address),
      Tx.contractCall('hive_progress_tracker', 'log-progress', 
        [
          types.utf8('Completed feature Y'),
          types.ascii('design'),
          types.none(),
          types.list([types.ascii('design'), types.ascii('ui')])
        ], 
        deployer.address)
    ]);

    // Verify total entries
    let totalEntries = chain.callReadOnlyFn(
      'hive_progress_tracker', 
      'get-total-progress-entries', 
      [], 
      deployer.address
    );
    totalEntries.result.expectUint(2);

    // Retrieve specific entries
    let entry0 = chain.callReadOnlyFn(
      'hive_progress_tracker', 
      'get-progress-entry', 
      [types.uint(0)], 
      deployer.address
    );
    entry0.result.expectSome();

    let entry1 = chain.callReadOnlyFn(
      'hive_progress_tracker', 
      'get-progress-entry', 
      [types.uint(1)], 
      deployer.address
    );
    entry1.result.expectSome();
  }
});

Clarinet.test({
  name: "Transfer contract ownership",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const newOwner = accounts.get('wallet_1')!;

    // Transfer ownership from deployer to wallet_1
    let block = chain.mineBlock([
      Tx.contractCall('hive_progress_tracker', 'transfer-ownership', 
        [types.principal(newOwner.address)], 
        deployer.address)
    ]);

    // Check transaction result
    block.receipts[0].result.expectOk().expectBool(true);

    // Try to do an owner-only action with new owner
    block = chain.mineBlock([
      Tx.contractCall('hive_progress_tracker', 'register-member', 
        [types.ascii('contributor')], 
        newOwner.address)
    ]);
    block.receipts[0].result.expectOk();

    // Previous owner should now be unauthorized
    block = chain.mineBlock([
      Tx.contractCall('hive_progress_tracker', 'register-member', 
        [types.ascii('contributor')], 
        deployer.address)
    ]);
    block.receipts[0].result.expectErr().expectUint(401);
  }
});

Clarinet.test({
  name: "Deactivate a member",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const member = accounts.get('wallet_1')!;

    // Register a member
    let block = chain.mineBlock([
      Tx.contractCall('hive_progress_tracker', 'register-member', 
        [types.ascii('contributor')], 
        member.address)
    ]);

    // Deactivate the member
    block = chain.mineBlock([
      Tx.contractCall('hive_progress_tracker', 'deactivate-member', 
        [types.principal(member.address)], 
        deployer.address)
    ]);

    // Check transaction result
    block.receipts[0].result.expectOk().expectBool(true);

    // Verify member is no longer active
    let isMember = chain.callReadOnlyFn(
      'hive_progress_tracker', 
      'is-member', 
      [types.principal(member.address)], 
      deployer.address
    );
    isMember.result.expectBool(false);

    // Try to log progress (should fail)
    block = chain.mineBlock([
      Tx.contractCall('hive_progress_tracker', 'log-progress', 
        [
          types.utf8('Completed feature X'),
          types.ascii('development'),
          types.none(),
          types.list([types.ascii('feature'), types.ascii('frontend')])
        ], 
        member.address)
    ]);
    block.receipts[0].result.expectErr().expectUint(401);
  }
});
Clarinet.test({
  name: "Validate proof link input for progress logging",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    // Register the member first
    let block = chain.mineBlock([
      Tx.contractCall('hive_progress_tracker', 'register-member', 
        [types.ascii('contributor')], 
        deployer.address)
    ]);

    // Test valid HTTPS link
    block = chain.mineBlock([
      Tx.contractCall('hive_progress_tracker', 'log-progress-with-validation', 
        [
          types.utf8('Completed feature X'),
          types.ascii('development'),
          types.some(types.utf8('https://example.com/proof')),
          types.list([types.ascii('feature'), types.ascii('frontend')])
        ], 
        deployer.address)
    ]);
    block.receipts[0].result.expectOk();

    // Test valid HTTP link
    block = chain.mineBlock([
      Tx.contractCall('hive_progress_tracker', 'log-progress-with-validation', 
        [
          types.utf8('Completed feature Y'),
          types.ascii('design'),
          types.some(types.utf8('http://example.com/proof')),
          types.list([types.ascii('design'), types.ascii('ui')])
        ], 
        deployer.address)
    ]);
    block.receipts[0].result.expectOk();

    // Test invalid link (too short)
    block = chain.mineBlock([
      Tx.contractCall('hive_progress_tracker', 'log-progress-with-validation', 
        [
          types.utf8('Completed feature Z'),
          types.ascii('testing'),
          types.some(types.utf8('invalid')),
          types.list([types.ascii('test')])
        ], 
        deployer.address)
    ]);
    block.receipts[0].result.expectErr().expectUint(404);

    // Test invalid link format
    block = chain.mineBlock([
      Tx.contractCall('hive_progress_tracker', 'log-progress-with-validation', 
        [
          types.utf8('Completed feature W'),
          types.ascii('documentation'),
          types.some(types.utf8('ftp://example.com/invalid')),
          types.list([types.ascii('docs')])
        ], 
        deployer.address)
    ]);
    block.receipts[0].result.expectErr().expectUint(404);
  }
});

Clarinet.test({
  name: "Prevent transfer of ownership to the same address",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    // Try to transfer ownership to the same address
    let block = chain.mineBlock([
      Tx.contractCall('hive_progress_tracker', 'transfer-ownership', 
        [types.principal(deployer.address)], 
        deployer.address)
    ]);

    // Check transaction result (should fail)
    block.receipts[0].result.expectErr().expectUint(401);
  }
});

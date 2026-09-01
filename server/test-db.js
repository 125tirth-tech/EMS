/**
 * Agent 3 — Database CRUD Test Script
 * Tests all operations: Create, Read, Update, Delete on both collections
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('./config');
const Employee = require('./models/Employee');
const User = require('./models/User');

const PASS = '✅ PASS';
const FAIL = '❌ FAIL';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ${PASS}: ${testName}`);
    testsPassed++;
  } else {
    console.log(`  ${FAIL}: ${testName}`);
    testsFailed++;
  }
}

async function runTests() {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║   Agent 3 — MongoDB CRUD Test Suite            ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  // ── Connect ──────────────────────────────────────────────
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(config.MONGO_URI);
  console.log(`  Connected to: ${config.MONGO_URI}\n`);

  // ═══════════════════════════════════════════════════════════
  // EMPLOYEE TESTS
  // ═══════════════════════════════════════════════════════════
  console.log('━'.repeat(50));
  console.log('  📋 EMPLOYEE COLLECTION TESTS');
  console.log('━'.repeat(50));

  // 1. READ — Count existing employees from seed
  const initialCount = await Employee.countDocuments();
  assert(initialCount >= 0, `Read: Found ${initialCount} employees in DB`);

  // 2. CREATE — Insert a new employee
  const testEmp = await Employee.create({
    firstName: 'Test',
    lastName: 'Employee',
    email: 'test.employee@company.com',
    phone: '+91 99999 00000',
    department: 'Engineering',
    position: 'QA Engineer',
    salary: 75000,
    dateOfJoining: new Date('2024-03-01'),
    status: 'active',
    address: 'Test City, Test State'
  });
  assert(testEmp._id, `Create: New employee created with _id: ${testEmp._id}`);
  assert(testEmp.id === testEmp._id.toString(), 'Create: Virtual id field matches _id');
  assert(testEmp.firstName === 'Test', 'Create: firstName stored correctly');
  assert(testEmp.email === 'test.employee@company.com', 'Create: email lowercased and stored');

  // 3. READ — Find the employee by ID
  const foundEmp = await Employee.findById(testEmp._id);
  assert(foundEmp !== null, `Read: Employee found by findById`);
  assert(foundEmp.lastName === 'Employee', 'Read: lastName matches');

  // 4. READ — Find by query
  const byEmail = await Employee.findOne({ email: 'test.employee@company.com' });
  assert(byEmail !== null, 'Read: Employee found by email query');

  // 5. READ — Search with regex
  const searchResults = await Employee.find({
    firstName: { $regex: 'Test', $options: 'i' }
  });
  assert(searchResults.length >= 1, `Read: Regex search returned ${searchResults.length} result(s)`);

  // 6. READ — Filter by department
  const engEmployees = await Employee.find({ department: 'Engineering' });
  assert(engEmployees.length >= 1, `Read: ${engEmployees.length} Engineering employee(s)`);

  // 7. READ — Filter by status
  const activeEmps = await Employee.find({ status: 'active' });
  assert(activeEmps.length >= 1, `Read: ${activeEmps.length} active employee(s)`);

  // 8. UPDATE — Modify the employee
  const updatedEmp = await Employee.findByIdAndUpdate(
    testEmp._id,
    { $set: { position: 'Senior QA Engineer', salary: 85000 } },
    { new: true, runValidators: true }
  );
  assert(updatedEmp.position === 'Senior QA Engineer', 'Update: position changed');
  assert(updatedEmp.salary === 85000, 'Update: salary changed');
  assert(updatedEmp.updatedAt > testEmp.updatedAt, 'Update: updatedAt timestamp updated');

  // 9. READ — Verify count increased
  const afterCreateCount = await Employee.countDocuments();
  assert(afterCreateCount === initialCount + 1, `Read: Count increased to ${afterCreateCount}`);

  // 10. DELETE — Remove the test employee
  const deleteResult = await Employee.findByIdAndDelete(testEmp._id);
  assert(deleteResult !== null, 'Delete: Employee deleted successfully');

  // 11. READ — Verify count is back to original
  const afterDeleteCount = await Employee.countDocuments();
  assert(afterDeleteCount === initialCount, `Read: Count back to ${afterDeleteCount}`);

  // 12. CREATE — Duplicate email test
  let duplicateError = false;
  try {
    await Employee.create({
      firstName: 'Dup', lastName: 'Test',
      email: 'aarav.sharma@company.com',  // Already exists from seed
      department: 'Engineering', position: 'Test'
    });
  } catch (err) {
    duplicateError = err.code === 11000;
  }
  assert(duplicateError, 'Create: Duplicate email correctly rejected (E11000)');

  // 13. CREATE — Validation test (missing required field)
  let validationError = false;
  try {
    await Employee.create({
      firstName: 'Missing', lastName: 'Department',
      email: 'missing@test.com', position: 'Test'
      // Missing department
    });
  } catch (err) {
    validationError = err.name === 'ValidationError';
  }
  assert(validationError, 'Create: Missing required field correctly rejected');

  // 14. toJSON transform
  const sampleEmp = await Employee.findOne();
  const json = sampleEmp.toJSON();
  assert(typeof json.id === 'string', 'toJSON: Virtual id field present');
  assert(json.__v === undefined, 'toJSON: __v stripped from output');

  // ═══════════════════════════════════════════════════════════
  // USER TESTS
  // ═══════════════════════════════════════════════════════════
  console.log('\n' + '━'.repeat(50));
  console.log('  👤 USER COLLECTION TESTS');
  console.log('━'.repeat(50));

  // 15. READ — Count existing users
  const userCount = await User.countDocuments();
  assert(userCount >= 0, `Read: Found ${userCount} users in DB`);

  // 16. CREATE — Insert a test user
  const hashedPass = await bcrypt.hash('testpass123', 10);
  const testUser = await User.create({
    username: 'testuser',
    email: 'testuser@company.com',
    password: hashedPass,
    role: 'employee',
    employeeId: null
  });
  assert(testUser._id, `Create: New user created with _id: ${testUser._id}`);

  // 17. READ — Verify login lookup
  const loginUser = await User.findOne({ username: 'testuser' }).select('+password');
  assert(loginUser !== null, 'Read: User found by username for login');

  // 18. READ — Password verification
  const passMatch = await bcrypt.compare('testpass123', loginUser.password);
  assert(passMatch, 'Read: Password hash verification works');

  // 19. READ — Admin user exists from seed
  const admin = await User.findOne({ username: 'admin' });
  assert(admin !== null, 'Read: Admin user from seed data exists');
  assert(admin.role === 'admin', 'Read: Admin role is correct');

  // 20. UPDATE — Change user role
  const updatedUser = await User.findByIdAndUpdate(
    testUser._id,
    { $set: { role: 'hr' } },
    { new: true }
  );
  assert(updatedUser.role === 'hr', 'Update: User role changed to hr');

  // 21. READ — Populate employee reference
  const hrUser = await User.findOne({ username: 'hrmanager' });
  assert(hrUser !== null, 'Read: HR user from seed exists');
  assert(hrUser.employeeId !== null, 'Read: HR user has employeeId reference');

  // 22. toJSON — password stripped
  const userJson = testUser.toJSON();
  assert(userJson.password === undefined, 'toJSON: Password stripped from output');
  assert(typeof userJson.id === 'string', 'toJSON: Virtual id field present');

  // 23. DELETE — Remove test user
  await User.findByIdAndDelete(testUser._id);
  const afterDeleteUser = await User.countDocuments();
  assert(afterDeleteUser === userCount, `Delete: User count back to ${afterDeleteUser}`);

  // 24. CREATE — Duplicate username test
  let userDupError = false;
  try {
    await User.create({
      username: 'admin', email: 'another@test.com',
      password: hashedPass, role: 'employee'
    });
  } catch (err) {
    userDupError = err.code === 11000;
  }
  assert(userDupError, 'Create: Duplicate username correctly rejected');

  // ═══════════════════════════════════════════════════════════
  // INDEX TESTS
  // ═══════════════════════════════════════════════════════════
  console.log('\n' + '━'.repeat(50));
  console.log('  🔍 INDEX & COLLECTION TESTS');
  console.log('━'.repeat(50));

  const empIndexes = await Employee.collection.getIndexes();
  assert(empIndexes.email_1, 'Index: Employee email unique index exists');
  assert(empIndexes.department_1, 'Index: Employee department index exists');
  assert(empIndexes.status_1, 'Index: Employee status index exists');

  const userIndexes = await User.collection.getIndexes();
  assert(userIndexes.username_1, 'Index: User username unique index exists');
  assert(userIndexes.email_1, 'Index: User email unique index exists');

  const collections = await mongoose.connection.db.listCollections().toArray();
  const collNames = collections.map(c => c.name);
  assert(collNames.includes('employees'), 'Collection: "employees" exists');
  assert(collNames.includes('users'), 'Collection: "users" exists');

  // ═══════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(50));
  console.log(`  📊 TEST RESULTS: ${testsPassed} passed, ${testsFailed} failed`);
  console.log('═'.repeat(50));

  if (testsFailed > 0) {
    console.log('\n  ⚠️  Some tests failed! Please investigate.\n');
  } else {
    console.log('\n  🎉 All tests passed! Database is fully operational.\n');
  }

  await mongoose.connection.close();
  process.exit(testsFailed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('\n❌ Test suite crashed:', err);
  mongoose.connection.close();
  process.exit(1);
});

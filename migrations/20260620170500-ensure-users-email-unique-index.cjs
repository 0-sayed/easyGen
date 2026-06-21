const EMAIL_INDEX_NAME = "email_1";
const USERS_COLLECTION = "users";

function isIndexNotFoundError(error) {
  return error?.code === 27 || error?.codeName === "IndexNotFound";
}

async function findDuplicateEmails(db) {
  return db
    .collection(USERS_COLLECTION)
    .aggregate([
      { $group: { _id: "$email", count: { $sum: 1 } } },
      { $match: { _id: { $ne: null }, count: { $gt: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: 5 },
    ])
    .toArray();
}

function formatDuplicateEmailSummary(duplicates) {
  const maxDuplicateCount = Math.max(...duplicates.map((duplicate) => duplicate.count));

  return `Duplicate groups: ${duplicates.length}. Max duplicates in one group: ${maxDuplicateCount}.`;
}

module.exports = {
  async up(db) {
    const duplicateEmails = await findDuplicateEmails(db);

    if (duplicateEmails.length > 0) {
      throw new Error(
        `Cannot create unique index ${EMAIL_INDEX_NAME}: duplicate users.email values exist. Resolve duplicates before rerunning migration. ${formatDuplicateEmailSummary(duplicateEmails)}`
      );
    }

    await db
      .collection(USERS_COLLECTION)
      .createIndex({ email: 1 }, { name: EMAIL_INDEX_NAME, unique: true });
  },

  async down(db) {
    try {
      await db.collection(USERS_COLLECTION).dropIndex(EMAIL_INDEX_NAME);
    } catch (error) {
      if (isIndexNotFoundError(error)) {
        return;
      }

      throw error;
    }
  },
};

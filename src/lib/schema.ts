// src/lib/schema.ts
import { sql, type InferSelectModel } from 'drizzle-orm';
import {
  pgTable,
  varchar,
  timestamp,
  json,
  jsonb,
  uuid,
  text,
  primaryKey,
  foreignKey,
  boolean,
  integer,
  pgEnum,
} from 'drizzle-orm/pg-core';
import type { TokenUsage as TokenUsed } from './usage';

export const policy = pgTable("Policy", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  name: varchar("name", { length: 250 }).notNull(),
  detail: text("detail"),
  tokenLimit: integer("token_limit").default(0).notNull(),
  defaultTokenLimit: integer("default_token_limit").default(0).notNull(),
  defaultModel: varchar("default_model", { length: 250 }).default("google/gemini-2.5-pro"),
  fileLimit: integer("file_limit").default(1).notNull(),
  fileSizeLimit: integer("file_size").default(5).notNull(),
  share: boolean("share").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Policy = InferSelectModel<typeof policy>;

export const prefixEnum = pgEnum('prefix_enum', [
  'นาย',
  'นาง',
  'นางสาว'
])

export type PrefixEnum = typeof prefixEnum["enumValues"];

export const roleEnum = pgEnum('role_enum', [
  'บุคลากรสายวิชาการ',
  'บุคลากรสายสนับสนุน',
  'บุคลากรภายนอก',
  'นักศึกษา'
])

export type RoleEnum = (typeof roleEnum.enumValues)[number];


export const faculty = pgTable("Faculty", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 250 }).notNull(),
  detail: text("detail"),
})

export type Faculty = InferSelectModel<typeof faculty>

export const department = pgTable("Department", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 250 }).notNull(),
  detail: text("detail"),
  facultyId: uuid().notNull(),
}, (table) => {
  return {
    departmentFacultyIdFkey: foreignKey({
      columns: [table.facultyId],
      foreignColumns: [faculty.id],
      name: "Faculty_facultyId_fkey"
    }).onDelete("cascade")
  }
})

export type Department = InferSelectModel<typeof department>

export const user = pgTable('User', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  email: varchar('email', { length: 64 }).notNull(),
  // password: varchar('password', { length: 64 }),
  prefix: prefixEnum('prefix'),
  firstname: varchar("firstname", { length: 250 }),
  lastname: varchar("lastname", { length: 250 }),
  role: roleEnum("role"),
  departmentId: uuid("department").references(() => department.id),
  policyId: uuid("policyId").references(() => policy.id),
});

export type User = InferSelectModel<typeof user>;

export const ban = pgTable(
  "Ban",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id").references(() => user.id), // onDelete cascade ใช้ผ่าน FK ด้านล่าง
    policyId: uuid("policy_id").references(() => policy.id), // null = Global scope
    reason: text("reason"),
    startAt: timestamp("start_at").defaultNow().notNull(),
    endAt: timestamp("end_at"),
  },
  (table) => ({
    banUserFk: foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "Ban_userId_fkey",
    }).onDelete("cascade"),
    banPolicyFk: foreignKey({
      columns: [table.policyId],
      foreignColumns: [policy.id],
      name: "Ban_policyId_fkey",
    }).onDelete("set null"),
  }),
);

export type Ban = InferSelectModel<typeof ban>;

export const chat = pgTable('Chat', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  createdAt: timestamp('createdAt').notNull(),
  title: text('title').notNull(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  visibility: varchar('visibility', { enum: ['public', 'private'] })
    .notNull()
    .default('private'),
  lastContext: jsonb('lastContext').$type<TokenUsed | null>(),
});

export type Chat = InferSelectModel<typeof chat>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://chat-sdk.dev/docs/migration-guides/message-parts
// export const messageDeprecated = pgTable('Message', {
//   id: uuid('id').primaryKey().notNull().defaultRandom(),
//   chatId: uuid('chatId')
//     .notNull()
//     .references(() => chat.id),
//   role: varchar('role').notNull(),
//   content: json('content').notNull(),
//   createdAt: timestamp('createdAt').notNull(),
// });

// export type MessageDeprecated = InferSelectModel<typeof messageDeprecated>;

export const message = pgTable('Message', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chatId')
    .notNull()
    .references(() => chat.id),
  role: varchar('role').notNull(),
  parts: json('parts').notNull(),
  attachments: json('attachments').notNull(),
  createdAt: timestamp('createdAt').notNull(),
});

export type DBMessage = InferSelectModel<typeof message>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://chat-sdk.dev/docs/migration-guides/message-parts
// export const voteDeprecated = pgTable(
//   'Vote',
//   {
//     chatId: uuid('chatId')
//       .notNull()
//       .references(() => chat.id),
//     messageId: uuid('messageId')
//       .notNull()
//       .references(() => messageDeprecated.id),
//     isUpvoted: boolean('isUpvoted').notNull(),
//   },
//   (table) => {
//     return {
//       pk: primaryKey({ columns: [table.chatId, table.messageId] }),
//     };
//   },
// );

// export type VoteDeprecated = InferSelectModel<typeof voteDeprecated>;

// export const vote = pgTable(
//   'Vote_v2',
//   {
//     chatId: uuid('chatId')
//       .notNull()
//       .references(() => chat.id),
//     messageId: uuid('messageId')
//       .notNull()
//       .references(() => message.id),
//     isUpvoted: boolean('isUpvoted').notNull(),
//   },
//   (table) => {
//     return {
//       pk: primaryKey({ columns: [table.chatId, table.messageId] }),
//     };
//   },
// );

// export type Vote = InferSelectModel<typeof vote>;

export const document = pgTable(
  'Document',
  {
    id: uuid('id').notNull().defaultRandom(),
    createdAt: timestamp('createdAt').notNull(),
    title: text('title').notNull(),
    content: text('content'),
    kind: varchar('text', { enum: ['text', 'code', 'image', 'sheet'] })
      .notNull()
      .default('text'),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.id, table.createdAt] }),
    };
  },
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = pgTable(
  'Suggestion',
  {
    id: uuid('id').notNull().defaultRandom(),
    documentId: uuid('documentId').notNull(),
    documentCreatedAt: timestamp('documentCreatedAt').notNull(),
    originalText: text('originalText').notNull(),
    suggestedText: text('suggestedText').notNull(),
    description: text('description'),
    isResolved: boolean('isResolved').notNull().default(false),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
    createdAt: timestamp('createdAt').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
  }),
);

export type Suggestion = InferSelectModel<typeof suggestion>;

export const stream = pgTable(
  'Stream',
  {
    id: uuid('id').notNull().defaultRandom(),
    chatId: uuid('chatId').notNull(),
    createdAt: timestamp('createdAt').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    chatRef: foreignKey({
      columns: [table.chatId],
      foreignColumns: [chat.id],
    }),
  }),
);

export type Stream = InferSelectModel<typeof stream>;


export const account = pgTable("Account", {
  userId: uuid().notNull(),
  type: text().notNull(),
  provider: text().notNull(),
  providerAccountId: text().notNull(),
  refreshToken: text("refresh_token"),
  accessToken: text("access_token"),
  expiresAt: integer("expires_at"),
  tokenType: text("token_type"),
  scope: text(),
  idToken: text("id_token"),
  sessionState: text("session_state"),
  createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
},
  (table) => {
    return {
      accountUserIdFkey: foreignKey({
        columns: [table.userId],
        foreignColumns: [user.id],
        name: "Account_userId_fkey"
      }).onUpdate("cascade").onDelete("cascade"),
      accountPkey: primaryKey({ columns: [table.provider, table.providerAccountId], name: "Account_pkey" }),
    }
  });

export type Account = InferSelectModel<typeof account>

export const model = pgTable("Model", {
  id: uuid("id").primaryKey().defaultRandom(),
  modelId: varchar("modelId", { length: 250 }).notNull(),
  name: varchar("name", { length: 250 }).notNull(),
  description: varchar("description", { length: 255 }),
  provider: varchar("provider", { length: 20 }).notNull(),
  is_active: boolean("is_active").default(true),
  createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
})

export type Model = InferSelectModel<typeof model>

export const tokenUsage = pgTable("TokenUsage", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  createAt: timestamp("createdAt").notNull(),
  userId: uuid("userId").notNull().references(() => user.id),
  inputTokens: integer("inputTokens").notNull().default(0),
  outputTokens: integer("outputTokens").notNull().default(0),
  reasoningTokens: integer("reasoningTokens").notNull().default(0),
  cachedInputTokens: integer("cachedInputTokens").notNull().default(0),
})

export type TokenUsage = InferSelectModel<typeof tokenUsage>

export const policyModelMap = pgTable(
  "PolicyModelMap",
  {
    policyId: uuid("policyId")
      .references(() => policy.id, { onDelete: "cascade" }).defaultRandom(),
    modelId: uuid("modelId")
      .references(() => model.id, { onDelete: "cascade" }).defaultRandom(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.policyId, table.modelId] }),
  })
);

export type PolicyModelMap = InferSelectModel<typeof policyModelMap>

export const admin = pgTable('Admin', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  email: varchar('email', { length: 64 }).notNull(),
  prefix: prefixEnum('prefix'),
  firstname: varchar("firstname", { length: 250 }),
  lastname: varchar("lastname", { length: 250 }),
  department: varchar("department", { length: 250 }),
});

export type Admin = InferSelectModel<typeof admin>;

export const suggestAction = pgTable('SuggestAction', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  title: varchar('title', { length: 255 }),
  label: varchar('label', { length: 255 }),
  action: text('action'),
  publish: boolean('publish').default(false),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

export type SuggestAction = InferSelectModel<typeof suggestAction>
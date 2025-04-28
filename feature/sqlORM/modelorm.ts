import { DataTypes } from 'sequelize';
import { sequelizeDbConnection } from './sqlDbConnection';
import { 
  BusinessPostInstance,
  BusinessInstance,
  ClientInstance,
  ClientUsersInstance,
  ActiveSessionsInstance
 } from './interfaceorm'; 

// BusinessPosts table
export const BusinessPostModel = sequelizeDbConnection.define<BusinessPostInstance>(
  'business_posts',
  {
    platform: { type: DataTypes.TEXT, allowNull: false },
    note_id: { type: DataTypes.TEXT, allowNull: false, primaryKey: true },
    original_note_id: { type: DataTypes.UUID, allowNull: true },
    type: { type: DataTypes.TEXT, allowNull: true },
    title: { type: DataTypes.TEXT, allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    video_url: { type: DataTypes.TEXT, allowNull: true },
    create_time: { type: DataTypes.DATE, allowNull: false },
    last_update_time: { type: DataTypes.DATE, allowNull: true },
    user_id: { type: DataTypes.TEXT, allowNull: true },
    nickname: { type: DataTypes.TEXT, allowNull: true },
    avatar: { type: DataTypes.TEXT, allowNull: true },
    liked_count: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    collected_count: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    comment_count: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    share_count: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    ip_location: { type: DataTypes.TEXT, allowNull: true },
    image_list: { type: DataTypes.TEXT, allowNull: true },
    tag_list: { type: DataTypes.TEXT, allowNull: true },
    last_modify_ts: { type: DataTypes.DATE, allowNull: true },
    note_url: { type: DataTypes.TEXT, allowNull: true },
    source_keyword: { type: DataTypes.TEXT, allowNull: true },
    post_topic: { type: DataTypes.TEXT, allowNull: true },
    post_language: { type: DataTypes.TEXT, allowNull: true },
    english_title: { type: DataTypes.TEXT, allowNull: true },
    english_desc: { type: DataTypes.TEXT, allowNull: true },
    english_ip_location: { type: DataTypes.TEXT, allowNull: true },
    english_summary: { type: DataTypes.TEXT, allowNull: true },
    english_sentiment: { type: DataTypes.STRING(10), allowNull: true },
    english_positive_topics: { type: DataTypes.TEXT, allowNull: true },
    english_negative_topics: { type: DataTypes.TEXT, allowNull: true },
    business_id: { type: DataTypes.UUID, allowNull: true },
    is_relevant: { type: DataTypes.BOOLEAN, allowNull: true },
    cover_url: { type: DataTypes.TEXT, allowNull: true },
    video_download_url: { type: DataTypes.TEXT, allowNull: true },
    english_tag_list: { type: DataTypes.TEXT, allowNull: true },
    hashtag_topic_category: { type: DataTypes.TEXT, allowNull: true },
    english_desc_literal: { type: DataTypes.TEXT, allowNull: true },
    relevance_percent: { type: DataTypes.INTEGER, allowNull: true },
    has_negative_or_critical_feedback: { type: DataTypes.BOOLEAN, allowNull: true },
    negative_feedback: { type: DataTypes.TEXT, allowNull: true },
    is_wrong_relevancy: { type: DataTypes.BOOLEAN, allowNull: true },
    is_good_summary: { type: DataTypes.BOOLEAN, allowNull: true },
    is_good_negative_feedback: { type: DataTypes.BOOLEAN, allowNull: true },
    tiebreaker_in_relevancy: { type: DataTypes.BOOLEAN, allowNull: true },
    english_preview_text: { type: DataTypes.TEXT, allowNull: true },
    last_modify_action: { type: DataTypes.TEXT, allowNull: true },
    import_id: { type: DataTypes.UUID, allowNull: true },
    is_official_post: { type: DataTypes.BOOLEAN, allowNull: true },
  },
  {
    tableName: 'business_posts',
    timestamps: false,
  }
);

export const BusinessModel = sequelizeDbConnection.define<BusinessInstance>(
  'business',
  {
    business_id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
    },
    business_name: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    search_keywords: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: false,
    },
    report_frequency: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    business_city: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    business_type: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    similar_businesses: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
    },
    total_relevant_posts: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
  },
  {
    tableName: 'business',
    timestamps: false,
  }
);

export const ClientModel = sequelizeDbConnection.define<ClientInstance>(
  'clients',
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
    },
    client_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    send_email: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    emails_list: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: false,
    },
    business_mapping: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: false,
    },
    email_trigger_time: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    report_days: {
      type: DataTypes.ARRAY(DataTypes.INTEGER),
      allowNull: true,
    },
  },
  {
    tableName: 'clients',
    timestamps: false,
  }
);

export const ClientUsersModel = sequelizeDbConnection.define<ClientUsersInstance>(
  'client_users',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
    },
    client_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    registered_email: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    
  },
  {
    tableName: 'client_users',
    timestamps: false,
  }
);

export const ActiveSessionsModel = sequelizeDbConnection.define<ActiveSessionsInstance>(
  'active_sessions',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    session_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true
    },
    browser_id: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    last_active: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    ip_address: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  },
  {
    tableName: 'active_sessions',
    timestamps: false,
  }
);
export type TreeNode = {
  type: 'node';
  count: number;
  percentage: number;
  name: string;
  children: Tree[];
};

export type TreeLeaf = {
  type: 'leaf';
  name: string;
  count: number;
  percentage: number;
};

export type Tree = TreeNode | TreeLeaf;

export interface Topic {
  topic: string; // Original English topic
  displayTopic: string; // Chinese or English for display
  count: number;
  percentage: number;
  hasTranslation?: boolean;
}

export const convertTopicsToTree = (topics: Topic[]): Tree => {
  // Create a root node with the sum of all topic counts
  const totalCount = topics.reduce((sum, topic) => sum + topic.count, 0);
  
  // Convert each topic to a leaf node
  const children: Tree[] = topics.map(topic => ({
    type: 'leaf',
    name: topic.displayTopic,
    count: topic.count,
    percentage: topic.percentage
  }));

  // Return the root node with all topics as children
  return {
    type: 'node',
    name: 'Topics',
    count: totalCount,
    percentage: 1,
    children
  };
}; 

// ⭐ NEW FUNCTION - For NegativeFeedbackBubbleChart
export const convertTopicsToTreeWithDisplay = (topics: Topic[]): Tree => {
  const totalCount = topics.reduce((sum, topic) => sum + topic.count, 0);
  
  const children: Tree[] = topics.map(topic => ({
    type: 'leaf',
    name: topic.topic, // Use displayTopic directly
    count: topic.count,
    percentage: topic.percentage
  }));

  return {
    type: 'node',
    name: 'Topics',
    count: totalCount,
    percentage: 1,
    children
  };
};
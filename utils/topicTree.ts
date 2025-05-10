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
  topic: string;
  count: number;
  percentage: number;
}

export const convertTopicsToTree = (topics: Topic[]): Tree => {
  // Create a root node with the sum of all topic counts
  const totalCount = topics.reduce((sum, topic) => sum + topic.count, 0);
  
  // Convert each topic to a leaf node
  const children: Tree[] = topics.map(topic => ({
    type: 'leaf',
    name: topic.topic,
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
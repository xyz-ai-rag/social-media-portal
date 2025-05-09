export type TreeNode = {
  type: 'node';
  value: number;
  name: string;
  children: Tree[];
};

export type TreeLeaf = {
  type: 'leaf';
  name: string;
  value: number;
};

export type Tree = TreeNode | TreeLeaf;

export interface Topic {
  topic: string;
  count: number;
}

export const convertTopicsToTree = (topics: Topic[]): Tree => {
  // Create a root node with the sum of all topic counts
  const totalCount = topics.reduce((sum, topic) => sum + topic.count, 0);
  
  // Convert each topic to a leaf node
  const children: Tree[] = topics.map(topic => ({
    type: 'leaf',
    name: topic.topic,
    value: topic.count
  }));

  // Return the root node with all topics as children
  return {
    type: 'node',
    name: 'Topics',
    value: totalCount,
    children
  };
}; 
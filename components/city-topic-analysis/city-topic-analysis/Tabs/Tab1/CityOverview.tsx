import React from "react";
import CirclePacking from "../../CirclePacking";
import BarChart from "../../BarChart";

interface Overview {
  complimentTopics: any[];
  criticismTopics: any[];
  businessId: string;
  clientId: string;
  minCount: number;
  topicLimit: number;
}

const Overview: React.FC<Overview> = ({
  complimentTopics,
  criticismTopics,
  businessId,
  clientId,
  minCount,
  topicLimit,
}) => (
  <div className="flex flex-row gap-8 w-full">
    <div className="flex-1 flex flex-col items-center">
      <h2 className="text-lg font-bold mb-2">Compliments</h2>
      <div className="w-full h-[600px] flex justify-center items-center">
        <CirclePacking
          topics={complimentTopics}
          businessId={businessId}
          clientId={clientId}
          minCount={minCount}
          maxTopics={topicLimit}
          topicType="Compliment"
        />
      </div>
      <div className="h-6" />
      <div className="w-full">
        <BarChart
          topics={complimentTopics}
          businessId={businessId}
          clientId={clientId}
          minCount={minCount}
          maxTopics={topicLimit}
          topicType="Compliment"
        />
      </div>
    </div>
    <div className="flex-1 flex flex-col items-center">
      <h2 className="text-lg font-bold mb-2">Criticisms</h2>
      <div className="w-full h-[600px] flex justify-center items-center">
        <CirclePacking
          topics={criticismTopics}
          businessId={businessId}
          clientId={clientId}
          minCount={minCount}
          maxTopics={topicLimit}
          topicType="Criticism"
        />
      </div>
      <div className="h-6" />
      <div className="w-full">
        <BarChart
          topics={criticismTopics}
          businessId={businessId}
          clientId={clientId}
          minCount={minCount}
          maxTopics={topicLimit}
          topicType="Criticism"
        />
      </div>
    </div>
  </div>
);

export default Overview; 
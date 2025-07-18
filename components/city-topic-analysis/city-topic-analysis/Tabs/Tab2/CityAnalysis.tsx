"use client";
import { FC } from "react";
import GroupedBarChart from '../../GroupedBarChart/GroupedBarChart';
import DateRangePicker from "../../DateRangePicker";
import CityGeneralBubble from "./CityGeneralBubble";

interface Props {
  clientId: string;
  businessId: string;
}

const CitySpecificAnalysis: FC<Props> = ({ clientId, businessId }) => {
  return (
    <div className="flex flex-col items-center justify-center w-full min-h-[400px]">
      <div className="w-full max-w-4xl">
        <div className="flex justify-end mb-4">
          <DateRangePicker page="city-analysis" businessId={businessId} />
        </div>
        <div className="mb-8">
          <GroupedBarChart clientId={clientId} businessId={businessId} />
        </div>
        <div className="mt-32">
          <CityGeneralBubble businessId={businessId} clientId={clientId} />
        </div>
      </div>
    </div>
  );
};

export default CitySpecificAnalysis;

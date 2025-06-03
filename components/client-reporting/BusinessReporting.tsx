import React from 'react';

interface BusinessReportingProps {
  clientId: string;
  businessId: string;
}

export default function BusinessReporting({ clientId, businessId }: BusinessReportingProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-800">Business Performance Report</h2>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">Business reporting content will be implemented here.</p>
      </div>
    </div>
  );
} 
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestAnalytics() {
  return (
    <div className="space-y-6">
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="text-white">Test Analytics Working</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-300">This is a test to see if analytics components are rendering.</p>
        </CardContent>
      </Card>
    </div>
  );
}
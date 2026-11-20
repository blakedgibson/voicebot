import { Card, CardContent } from "@/components/ui/card";
import { INDUSTRIES, type Industry } from "@shared/schema";

interface IndustrySelectorProps {
  selectedIndustry: Industry | null;
  onSelect: (industry: Industry) => void;
  className?: string;
}

export default function IndustrySelector({ selectedIndustry, onSelect, className = "" }: IndustrySelectorProps) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
      {Object.entries(INDUSTRIES).map(([key, industry]) => (
        <Card
          key={key}
          className={`cursor-pointer transition-all duration-200 hover:shadow-lg group border-2 ${
            selectedIndustry === key
              ? 'border-current shadow-lg transform scale-105'
              : 'border-gray-200 hover:border-gray-300'
          }`}
          style={{
            borderColor: selectedIndustry === key ? industry.color : undefined,
          }}
          onClick={() => onSelect(key as Industry)}
          data-testid={`industry-${key}`}
        >
          <CardContent className="p-6">
            <div className="flex items-center mb-4">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200"
                style={{
                  backgroundColor: `${industry.color}20`,
                }}
              >
                <i
                  className={`${industry.icon} text-xl`}
                  style={{ color: industry.color }}
                ></i>
              </div>
              <div className="ml-4">
                <h3 className="font-semibold text-gray-900">{industry.name}</h3>
                <p className="text-sm text-gray-500">{industry.description}</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              {key === 'healthcare' && "Perfect for medical practices, hospitals, and telehealth platforms."}
              {key === 'legal' && "Streamline client intake and legal consultations."}
              {key === 'support' && "Reduce wait times with intelligent voice support."}
              {key === 'realestate' && "Qualify leads and schedule property viewings."}
              {key === 'education' && "Student assistance and educational guidance."}
              {key === 'ecommerce' && "Product recommendations and order support."}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Interaction } from '@shared/schema';

interface InteractionChartsProps {
  interactions: Interaction[];
}

const COLORS = [
  '#0d9488', // Teal 600
  '#0891b2', // Cyan 600
  '#0284c7', // Sky 600
  '#2563eb', // Blue 600
  '#4f46e5', // Indigo 600
  '#7c3aed', // Violet 600
];

export function InteractionCharts({ interactions }: InteractionChartsProps) {
  const typeData = useMemo(() => {
    const counts: Record<string, number> = {};
    interactions.forEach(i => {
      counts[i.type] = (counts[i.type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [interactions]);

  const distData = useMemo(() => {
      // Buckets for distance: <2.5, 2.5-3.0, 3.0-3.5, 3.5-4.0, >4.0
      const buckets = [
          { name: '< 2.5Å', max: 2.5, count: 0 },
          { name: '2.5-3.0Å', max: 3.0, count: 0 },
          { name: '3.0-3.5Å', max: 3.5, count: 0 },
          { name: '3.5-4.0Å', max: 4.0, count: 0 },
          { name: '> 4.0Å', max: 999, count: 0 },
      ];

      interactions.forEach(i => {
          for (const b of buckets) {
              if (i.distance <= b.max) {
                  b.count++;
                  break;
              }
          }
      });
      return buckets;
  }, [interactions]);

  if (interactions.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Interaction Types</h3>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={typeData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {typeData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                itemStyle={{ color: '#1f2937', fontWeight: 500 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-2 justify-center mt-2">
            {typeData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                    {entry.name} ({entry.value})
                </div>
            ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Bond Distance Distribution</h3>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={distData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis 
                dataKey="name" 
                tick={{fontSize: 10, fill: '#6b7280'}} 
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tick={{fontSize: 10, fill: '#6b7280'}} 
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                cursor={{ fill: '#f3f4f6' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="count" fill="#0d9488" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

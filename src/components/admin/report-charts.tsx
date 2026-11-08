'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { formatPrice } from '@/lib/utils';

interface CategoryRevenue {
  name: string;
  revenue: number; // in PHP
  count: number;
}

interface StatusDistribution {
  name: string;
  count: number;
}

export function ReportCharts({
  categoryData,
  statusData,
}: {
  categoryData: CategoryRevenue[];
  statusData: StatusDistribution[];
}) {
  const COLORS = ['#252126', '#D58FA4', '#F4B8C8', '#A27083', '#5E4B56'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Category Revenue Bar Chart */}
      <div className="lg:col-span-7 bg-card rounded-xl border border-border p-6 space-y-4">
        <div>
          <h3 className="font-serif text-base font-semibold text-foreground">
            Revenue by Service Category
          </h3>
          <p className="text-xs text-muted-foreground">
            Total realized and completed service revenue across categories.
          </p>
        </div>

        <div className="h-72 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryData} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#736971' }}
                interval={0}
                angle={-15}
                textAnchor="end"
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#736971' }}
                tickFormatter={(val) => `₱${val}`}
              />
              <Tooltip
                formatter={(val: any) => [`₱${Number(val).toLocaleString()}`, 'Revenue']}
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#EFE4E1',
                  borderRadius: '0.5rem',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="revenue" fill="#D58FA4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Appointment Status Pie Chart */}
      <div className="lg:col-span-5 bg-card rounded-xl border border-border p-6 space-y-4">
        <div>
          <h3 className="font-serif text-base font-semibold text-foreground">
            Appointment Status Distribution
          </h3>
          <p className="text-xs text-muted-foreground">
            Proportion of completed, confirmed, and pending sessions.
          </p>
        </div>

        <div className="h-72 w-full flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={85}
                paddingAngle={4}
                dataKey="count"
              >
                {statusData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#EFE4E1',
                  borderRadius: '0.5rem',
                  fontSize: '12px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border">
          {statusData.map((item, idx) => (
            <div key={item.name} className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: COLORS[idx % COLORS.length] }}
              />
              <span className="text-muted-foreground capitalize">
                {item.name}: <strong>{item.count}</strong>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

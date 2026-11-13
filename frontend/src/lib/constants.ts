// Authoritative baseline calculations and sample dataset matching academic project report

export const ACADEMIC_SAMPLE_CSV = `Day,Service,9 AM–11 AM,11 AM–1 PM,1 PM–4 PM,4 PM–6 PM
Monday,B&W Printing,0,0,0,0
Monday,Colour Printing,0,117,0,0
Monday,Binding,0,0,0,0
Monday,Photocopying,0,148,0,0
Tuesday,B&W Printing,29,43,214,0
Tuesday,Colour Printing,0,0,0,0
Tuesday,Binding,0,0,0,0
Tuesday,Photocopying,0,0,0,0
Wednesday,B&W Printing,0,0,0,0
Wednesday,Colour Printing,0,5,63,0
Wednesday,Binding,0,34,0,0
Wednesday,Photocopying,146,0,0,0
Thursday,B&W Printing,0,312,0,0
Thursday,Colour Printing,0,0,0,0
Thursday,Binding,0,0,0,0
Thursday,Photocopying,0,0,0,0
Friday,B&W Printing,230,0,0,0
Friday,Colour Printing,0,0,0,0
Friday,Binding,0,0,0,0
Friday,Photocopying,0,56,0,0
Saturday,B&W Printing,0,0,0,0
Saturday,Colour Printing,50,0,18,35
Saturday,Binding,28,0,25,7
Saturday,Photocopying,0,0,0,48
Sunday,B&W Printing,0,0,0,90
Sunday,Colour Printing,31,0,0,0
Sunday,Binding,0,13,0,0
Sunday,Photocopying,0,0,98,0`;

export const DEFAULT_BENCHMARK_CALCULATIONS = {
  total_weekly_demand: 1840,
  average_daily_demand: 262.86,
  top_service: { name: "B&W Printing", total_demand: 918, percentage: 49.89 },
  peak_time_slot: { label: "11 AM – 1 PM", total_demand: 728, rate_per_hour: 52.0 },
  weekly_matrix: [
    [259, 355, 214, 90],
    [81, 122, 81, 35],
    [28, 47, 25, 7],
    [146, 204, 98, 48],
  ],
  service_totals: {
    "B&W Printing": 918,
    "Colour Printing": 319,
    Binding: 107,
    Photocopying: 496,
  },
  service_percentages: {
    "B&W Printing": 49.89,
    "Colour Printing": 17.34,
    Binding: 5.82,
    Photocopying: 26.96,
  },
  timeslot_totals: {
    "9 AM–11 AM": 514,
    "11 AM–1 PM": 728,
    "1 PM–4 PM": 418,
    "4 PM–6 PM": 180,
  },
  duration_adjusted_rates: {
    "9 AM–11 AM": 36.71,
    "11 AM–1 PM": 52.0,
    "1 PM–4 PM": 19.9,
    "4 PM–6 PM": 12.86,
  },
  daily_totals: [
    { day_number: 1, day_name: "Mon", total_demand: 265 },
    { day_number: 2, day_name: "Tue", total_demand: 286 },
    { day_number: 3, day_name: "Wed", total_demand: 248 },
    { day_number: 4, day_name: "Thu", total_demand: 312 },
    { day_number: 5, day_name: "Fri", total_demand: 286 },
    { day_number: 6, day_name: "Sat", total_demand: 211 },
    { day_number: 7, day_name: "Sun", total_demand: 232 },
  ],
  busiest_day: { day_name: "Thursday", total_demand: 312 },
  least_busy_day: { day_name: "Saturday", total_demand: 211 },
  printer_metrics: {
    hp_laser_303dw: {
      model_name: "HP Laser 303dw",
      rated_ppm: 30,
      weekly_capacity: 113400,
      estimated_pages: 3672,
      load_ratio_percent: 3.24,
      status: "Optimal",
    },
    canon_pixma_g670: {
      model_name: "Canon PIXMA MegaTank G670",
      rated_ipm: 3.9,
      weekly_capacity: 14742,
      estimated_pages: 957,
      load_ratio_percent: 6.49,
      status: "Optimal",
    },
  },
  staff_metrics: {
    scheduled_availability_weekly_hours: 189,
    actual_available_weekly_hours: 189,
    total_workload_hours: 82.67,
    total_workload_minutes: 4960,
    weekly_utilization_percent: 43.74,
    daily_breakdown: [],
  },
  advanced_analysis: {
    matrix_rank: 7,
    mean_vector: { "B&W Printing": 32.79, "Colour Printing": 11.39, Binding: 3.82, Photocopying: 17.71 },
    covariance_matrix: {
      "B&W Printing": { "B&W Printing": 224.175, "Colour Printing": 69.272, Binding: 33.59, Photocopying: 126.122 },
      "Colour Printing": { "B&W Printing": 69.272, "Colour Printing": 28.914, Binding: 10.888, Photocopying: 34.672 },
      Binding: { "B&W Printing": 33.59, "Colour Printing": 10.888, Binding: 6.448, Photocopying: 18.725 },
      Photocopying: { "B&W Printing": 126.122, "Colour Printing": 34.672, Binding: 18.725, Photocopying: 83.249 },
    },
    correlation_matrix: {
      "B&W Printing": { "B&W Printing": 1.0, "Colour Printing": 0.86, Binding: 0.88, Photocopying: 0.92 },
      "Colour Printing": { "B&W Printing": 0.86, "Colour Printing": 1.0, Binding: 0.80, Photocopying: 0.71 },
      Binding: { "B&W Printing": 0.88, "Colour Printing": 0.80, Binding: 1.0, Photocopying: 0.81 },
      Photocopying: { "B&W Printing": 0.92, "Colour Printing": 0.71, Binding: 0.81, Photocopying: 1.0 },
    },
    eigenvalues: [323.828, 13.839, 3.768, 1.352],
    variance_explained: [94.47, 4.04, 1.1, 0.39],
    eigenvectors: [],
    dominant_direction: "Dominant direction accounts for 94.47% of total variance across services.",
  },
  recommendations: [
    {
      id: 1,
      title: "Stock More B&W Paper & Ink",
      description: "B&W Printing accounts for 49.89% of total demand. Ensure adequate stock of B&W paper and ink, especially before peak hours (11 AM – 1 PM).",
      category: "Inventory",
      priority: "High",
    },
    {
      id: 2,
      title: "Plan Staff for Midday Rush",
      description: "The busiest time slot is 11 AM – 1 PM. Schedule extra staff and keep printers ready during this period.",
      category: "Staffing",
      priority: "High",
    },
    {
      id: 3,
      title: "Prepare for Colour Printing Growth",
      description: "Colour Printing demand is 17.34%. Consider increasing colour paper stock and checking ink levels regularly.",
      category: "Operations",
      priority: "Medium",
    },
    {
      id: 4,
      title: "Optimize Resources",
      description: "Binding and Photocopying have lower demand. You can adjust staff and machine usage to save costs during off-peak hours.",
      category: "Efficiency",
      priority: "Low",
    },
  ],
};

export const SHOP_CHECKIN_CONFIG = {
  default_staff_count: 1,
  max_staff_count: 20,
  min_staff_count: 0,
  productive_work_factor: 1.0,
  printers: [
    {
      id: "hp_only",
      name: "Printer 1: HP Laser 303dw",
      service: "B&W Printing only",
      speed: "30 ppm (1,800 pages/hr)",
      label: "Printer 1 only (HP Laser 303dw)",
    },
    {
      id: "canon_only",
      name: "Printer 2: Canon PIXMA G670",
      service: "Colour Printing only",
      speed: "3.9 ipm (234 pages/hr)",
      label: "Printer 2 only (Canon PIXMA G670)",
    },
    {
      id: "none",
      name: "Neither printer is working",
      service: "Total printer capacity is 0",
      speed: "0 pages/hr",
      label: "Neither printer is working",
    },
  ],
};



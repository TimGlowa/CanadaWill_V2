# PoliticianStanceTable Component

A React component for displaying politician stance data in a responsive, styled table format.

## Features

- **Responsive Design**: Horizontal scrolling on smaller screens with `overflow-x-auto`
- **Styled Table**: Clean, modern styling with alternating row colors
- **Color-coded Stance Badges**: Green for Pro Canada, red for Pro Separation, gray for No Position
- **Conditional Columns**: Optional columns for re-election status, confidence, and badge eligibility
- **Loading & Empty States**: Proper handling of loading and empty data states
- **TypeScript Support**: Fully typed with comprehensive interfaces

## Props

```typescript
interface PoliticianStanceTableProps {
  /** Array of politician data to display in the table */
  politicians: Politician[];
  /** Optional loading state */
  loading?: boolean;
  /** Optional empty state message */
  emptyMessage?: string;
  /** Optional CSS class name for additional styling */
  className?: string;
  /** Whether to show the re-election status column */
  showReElectionStatus?: boolean;
  /** Whether to show the confidence column */
  showConfidence?: boolean;
  /** Whether to show the badge eligibility column */
  showBadgeEligibility?: boolean;
}
```

## Data Structure

```typescript
interface Politician {
  id: string;
  name: string;
  office: string;
  party?: string;
  district: string;
  level: 'federal' | 'provincial' | 'municipal';
  stance: PublicStance; // 'Pro Canada' | 'Pro Separation' | 'No Position'
  reElectionStatus?: 'running' | 'not-running' | 'unknown';
  badgeEligible?: boolean;
  confidence?: number;
  lastUpdated?: string;
  email?: string;
  website?: string;
  statements?: {
    text: string;
    source: string;
    date: string;
  }[];
}
```

## Usage Examples

### Basic Usage
```tsx
import PoliticianStanceTable from './components/politicians/PoliticianStanceTable';

<PoliticianStanceTable politicians={politiciansData} />
```

### With All Optional Columns
```tsx
<PoliticianStanceTable 
  politicians={politiciansData}
  showReElectionStatus={true}
  showConfidence={true}
  showBadgeEligibility={true}
/>
```

### With Loading State
```tsx
<PoliticianStanceTable 
  politicians={[]}
  loading={true}
/>
```

### With Custom Empty Message
```tsx
<PoliticianStanceTable 
  politicians={[]}
  emptyMessage="No politicians found for your postal code"
/>
```

## Styling

The component uses Tailwind CSS classes and follows the exact styling requirements:

- **Table Wrapper**: `overflow-x-auto mb-4`
- **Table**: `min-w-[600px] w-full table-auto divide-y divide-gray-200 rounded-lg shadow-sm`
- **Header Cells**: `px-4 py-2 text-left text-sm font-semibold uppercase bg-gray-100`
- **Row Colors**: Alternating `bg-white` and `bg-gray-50`
- **Stance Badges**: 
  - Base: `inline-block px-2 py-1 text-xs rounded-full font-medium`
  - Pro Canada: `bg-green-100 text-green-800`
  - Pro Separation: `bg-red-100 text-red-800`
  - No Position: `bg-gray-100 text-gray-800`

## Integration with Search Functionality

This component is designed to work seamlessly with the existing search functionality:

1. **Data Source**: Accepts politician data from the search results
2. **Stance Display**: Uses the same `PublicStance` type as other components
3. **Responsive Design**: Works well within the existing layout structure
4. **Consistent Styling**: Matches the design patterns of other politician components

## Accessibility

- Proper table semantics with `<table>`, `<thead>`, `<tbody>`, `<th>`, and `<td>` elements
- Color-coded badges with sufficient contrast ratios
- Responsive design that works on all screen sizes
- Clear loading and empty states

## Browser Support

- Modern browsers with CSS Grid and Flexbox support
- Responsive design with horizontal scrolling on mobile devices
- TypeScript support for development environments 
declare module 'lucide-react' {
  import React from 'react';
  
  export interface IconProps extends React.SVGProps<SVGSVGElement> {
    size?: number | string;
    color?: string;
    strokeWidth?: number | string;
  }
  
  export type Icon = React.ForwardRefExoticComponent<IconProps & React.RefAttributes<SVGSVGElement>>;
  
  export const ChevronLeft: Icon;
  export const ChevronRight: Icon;
  export const Quote: Icon;
  export const Calendar: Icon;
  export const TrendingUp: Icon;
  export const Globe: Icon;
  export const Users: Icon;
  export const Coins: Icon;
  export const MapPin: Icon;
  export const Film: Icon;
  export const BookOpen: Icon;
  export const Cpu: Icon;
  export const Sparkles: Icon;
  export const User: Icon;
  export const Award: Icon;
  export const Lightbulb: Icon;
  export const X: Icon;
  export const Map: Icon;
  export const MessageSquare: Icon;
}

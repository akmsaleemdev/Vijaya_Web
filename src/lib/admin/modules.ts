import { access } from "./http";

export const modules = {
  dashboard: { label: "Overview", roles: access.bookings },
  bookings: { label: "Bookings", roles: access.bookings },
  calendar: { label: "Calendar", roles: access.bookings },
  venues: { label: "Venues & pricing", roles: access.operations },
  content: { label: "Website content", roles: access.content },
  media: { label: "Media library", roles: access.content },
  enquiries: { label: "Enquiries", roles: access.operations },
  customers: { label: "Customers", roles: access.operations },
  payments: { label: "Payments", roles: access.operations },
  notifications: { label: "Notifications", roles: access.operations },
  users: { label: "Users & roles", roles: access.owner },
  audit: { label: "Audit log", roles: access.owner },
  settings: { label: "Settings", roles: access.owner },
};

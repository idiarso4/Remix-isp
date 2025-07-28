import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create admin user
  const adminUser = await prisma.user.create({
    data: {
      email: "admin@isp.com",
      passwordHash: await bcrypt.hash("admin123", 10),
    },
  });

  // Create admin employee
  const adminEmployee = await prisma.employee.create({
    data: {
      userId: adminUser.id,
      name: "System Administrator",
      phone: "+1234567890",
      position: "System Admin",
      division: "IT",
      role: "ADMIN",
      hireDate: new Date(),
      canHandleTickets: true,
      handlingStatus: "AVAILABLE",
    },
  });

  // Create technician users
  const techUser1 = await prisma.user.create({
    data: {
      email: "tech1@isp.com",
      passwordHash: await bcrypt.hash("tech123", 10),
    },
  });

  const techUser2 = await prisma.user.create({
    data: {
      email: "tech2@isp.com",
      passwordHash: await bcrypt.hash("tech123", 10),
    },
  });

  // Create technician employees
  const tech1 = await prisma.employee.create({
    data: {
      userId: techUser1.id,
      name: "John Technician",
      phone: "+1234567891",
      position: "Senior Technician",
      division: "Technical Support",
      role: "TECHNICIAN",
      hireDate: new Date(),
      canHandleTickets: true,
      handlingStatus: "AVAILABLE",
      maxConcurrentTickets: 8,
    },
  });

  const tech2 = await prisma.employee.create({
    data: {
      userId: techUser2.id,
      name: "Jane Support",
      phone: "+1234567892",
      position: "Network Technician",
      division: "Technical Support",
      role: "TECHNICIAN",
      hireDate: new Date(),
      canHandleTickets: true,
      handlingStatus: "AVAILABLE",
      maxConcurrentTickets: 6,
    },
  });

  // Create marketing user
  const marketingUser = await prisma.user.create({
    data: {
      email: "marketing@isp.com",
      passwordHash: await bcrypt.hash("marketing123", 10),
    },
  });

  const marketingEmployee = await prisma.employee.create({
    data: {
      userId: marketingUser.id,
      name: "Marketing Manager",
      phone: "+1234567893",
      position: "Marketing Manager",
      division: "Marketing",
      role: "MARKETING",
      hireDate: new Date(),
      canHandleTickets: false,
    },
  });

  // Create HR user
  const hrUser = await prisma.user.create({
    data: {
      email: "hr@isp.com",
      passwordHash: await bcrypt.hash("hr123", 10),
    },
  });

  const hrEmployee = await prisma.employee.create({
    data: {
      userId: hrUser.id,
      name: "HR Manager",
      phone: "+1234567894",
      position: "HR Manager",
      division: "Human Resources",
      role: "HR",
      hireDate: new Date(),
      canHandleTickets: false,
    },
  });

  // Create internet packages
  const basicPackage = await prisma.package.create({
    data: {
      name: "Basic Internet",
      speed: "10 Mbps",
      price: 25.00,
      duration: "MONTHLY",
      description: "Perfect for basic browsing and email",
    },
  });

  const standardPackage = await prisma.package.create({
    data: {
      name: "Standard Internet",
      speed: "25 Mbps",
      price: 45.00,
      duration: "MONTHLY",
      description: "Great for streaming and moderate usage",
    },
  });

  const premiumPackage = await prisma.package.create({
    data: {
      name: "Premium Internet",
      speed: "50 Mbps",
      price: 75.00,
      duration: "MONTHLY",
      description: "High-speed internet for heavy users",
    },
  });

  const unlimitedPackage = await prisma.package.create({
    data: {
      name: "Unlimited Pro",
      speed: "Unlimited",
      price: 120.00,
      duration: "MONTHLY",
      description: "Unlimited high-speed internet for businesses",
    },
  });

  // Create sample customers
  const customer1 = await prisma.customer.create({
    data: {
      name: "Alice Johnson",
      email: "alice@example.com",
      phone: "+1234567895",
      address: "123 Main St, City, State 12345",
      location: "Downtown Area",
      status: "ACTIVE",
      packageId: standardPackage.id,
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      name: "Bob Smith",
      email: "bob@example.com",
      phone: "+1234567896",
      address: "456 Oak Ave, City, State 12345",
      location: "Residential Area",
      status: "ACTIVE",
      packageId: basicPackage.id,
    },
  });

  const customer3 = await prisma.customer.create({
    data: {
      name: "Carol Williams",
      email: "carol@example.com",
      phone: "+1234567897",
      address: "789 Pine Rd, City, State 12345",
      location: "Suburban Area",
      status: "ACTIVE",
      packageId: premiumPackage.id,
    },
  });

  // Create sample payments
  await prisma.payment.create({
    data: {
      customerId: customer1.id,
      amount: 45.00,
      paymentDate: new Date(),
      status: "PAID",
    },
  });

  await prisma.payment.create({
    data: {
      customerId: customer2.id,
      amount: 25.00,
      paymentDate: new Date(),
      status: "PAID",
    },
  });

  await prisma.payment.create({
    data: {
      customerId: customer3.id,
      amount: 75.00,
      paymentDate: new Date(),
      status: "PENDING",
    },
  });

  // Create sample tickets
  const ticket1 = await prisma.ticket.create({
    data: {
      title: "Internet Connection Issues",
      description: "Customer experiencing slow internet speeds and frequent disconnections",
      status: "OPEN",
      priority: "HIGH",
      category: "NETWORK_ISSUES",
      customerId: customer1.id,
      assignedToId: tech1.id,
    },
  });

  const ticket2 = await prisma.ticket.create({
    data: {
      title: "Router Installation Request",
      description: "New customer needs router installation at their premises",
      status: "IN_PROGRESS",
      priority: "MEDIUM",
      category: "INSTALLATION",
      customerId: customer2.id,
      assignedToId: tech2.id,
    },
  });

  const ticket3 = await prisma.ticket.create({
    data: {
      title: "Equipment Replacement",
      description: "Customer reports damaged modem, needs replacement",
      status: "RESOLVED",
      priority: "URGENT",
      category: "EQUIPMENT_DAMAGE",
      customerId: customer3.id,
      assignedToId: tech1.id,
      completedAt: new Date(),
    },
  });

  // Create ticket notes
  await prisma.ticketNote.create({
    data: {
      ticketId: ticket1.id,
      employeeId: tech1.id,
      note: "Initial diagnosis shows signal strength issues. Scheduled site visit for tomorrow.",
    },
  });

  await prisma.ticketNote.create({
    data: {
      ticketId: ticket2.id,
      employeeId: tech2.id,
      note: "Installation scheduled for Friday 2 PM. Customer confirmed availability.",
    },
  });

  // Create ticket status history
  await prisma.ticketStatusHistory.create({
    data: {
      ticketId: ticket1.id,
      fromStatus: null,
      toStatus: "OPEN",
      changedBy: adminEmployee.id,
      reason: "Ticket created",
    },
  });

  await prisma.ticketStatusHistory.create({
    data: {
      ticketId: ticket3.id,
      fromStatus: "IN_PROGRESS",
      toStatus: "RESOLVED",
      changedBy: tech1.id,
      reason: "Equipment replaced successfully",
    },
  });

  // Create employee performance metrics
  await prisma.employeePerformance.create({
    data: {
      employeeId: tech1.id,
      totalTicketsResolved: 15,
      averageResolutionTime: 4.5,
      customerRating: 4.2,
      ticketsResolvedThisMonth: 8,
    },
  });

  await prisma.employeePerformance.create({
    data: {
      employeeId: tech2.id,
      totalTicketsResolved: 12,
      averageResolutionTime: 3.8,
      customerRating: 4.5,
      ticketsResolvedThisMonth: 6,
    },
  });

  // Create ticket feedback
  await prisma.ticketFeedback.create({
    data: {
      ticketId: ticket3.id,
      customerId: customer3.id,
      rating: 5,
      comment: "Excellent service! Technician was professional and resolved the issue quickly.",
    },
  });

  console.log("✅ Database seeded successfully!");
  console.log("\n📧 Default login credentials:");
  console.log("Admin: admin@isp.com / admin123");
  console.log("Technician 1: tech1@isp.com / tech123");
  console.log("Technician 2: tech2@isp.com / tech123");
  console.log("Marketing: marketing@isp.com / marketing123");
  console.log("HR: hr@isp.com / hr123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
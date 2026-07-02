export interface EmployeeRecord {
  id: number;
  firstName: string;
  lastName: string;
  age: number;
  salary: number;
}

export class DataGenerator {
  static generate(count: number): EmployeeRecord[] {
    const firstNames = [
      "Raj",
      "Amit",
      "Neha",
      "Priya",
      "Smit",
      "Karan",
      "Riya",
      "Vikas"
    ];

    const lastNames = [
      "Solanki",
      "Patel",
      "Shah",
      "Mehta",
      "Joshi",
      "Desai",
      "Trivedi",
      "Parmar"
    ];

    const records: EmployeeRecord[] = [];

    for (let i = 1; i <= count; i++) {
      records.push({
        id: i,
        firstName: firstNames[i % firstNames.length],
        lastName: lastNames[i % lastNames.length],
        age: 20 + (i % 45),
        salary: 300000 + ((i * 137) % 2000000)
      });
    }

    return records;
  }
}
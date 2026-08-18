export type Mode = "FullRandom" | "Controlled";
export type QueueStrategy = "Single" | "Random" | "ShortestQueue";
export type ServiceType = "Fixed" | "Variable";
export type ArrivalPattern = "Continuous" | "AllWaiting";

export interface Config {
  mode: Mode;
  customerCount: number;
  serverCount: number;
  queueStrategy: QueueStrategy;
  arrivalPattern: ArrivalPattern;
  serviceTime: { type: ServiceType; base: number; min: number; max: number };
  adverseEvents: { enabled: boolean; probability: number; additionalTimeMin: number; additionalTimeMax: number };
  seed: number;
}
export interface Event {
  customerId:number; arrivalTime:number; queueIndex:number; serverIndex:number;
  serviceStartTime:number; waitTime:number; serviceTime:number; completionTime:number; hadAdverseEvent:boolean;
}
export interface Stats {
  averageWait:number; minWait:number; maxWait:number; medianWait:number; p90Wait:number; p95Wait:number; p99Wait:number;
  averageServiceTime:number; totalSimulationTime:number; customersServed:number; customersWithAdverseEvents:number;
  adverseEventPercentage:number; averageQueueLength:number; maxQueueLength:number; averageServerUtilization:number;
  throughput:number; averageTimeInSystem:number; serverUtilization:number[]; maxQueueLengthByQueue:number[]; initialQueueLengthByQueue:number[];
}
export interface Result { id:string; seed:number; arrivalPattern:ArrivalPattern; statistics:Stats; events:Event[]; }

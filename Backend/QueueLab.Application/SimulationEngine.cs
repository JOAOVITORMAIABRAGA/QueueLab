using QueueLab.Domain;

namespace QueueLab.Application;

public interface ISimulationEngine
{
    SimulationResult Run(SimulationConfiguration configuration);
    ScenarioComparisonResult Compare(SimulationConfiguration a, SimulationConfiguration b);
}

/// <summary>
/// Discrete-event simulation of a physical service system.
/// Single queue: customers wait in one common line and take the first free server.
/// Multiple queues: each server owns a physical line; a routing strategy chooses the line at arrival.
/// </summary>
public sealed class SimulationEngine : ISimulationEngine
{
    public SimulationResult Run(SimulationConfiguration c)
    {
        var validation = SimulationValidator.Validate(c);
        if (validation.Count > 0) throw new ArgumentException(string.Join("; ", validation));

        var master = new Random(c.Seed);
        var baseInputs = CreateBaseCustomers(c, master);
        var events = c.QueueStrategy == QueueStrategy.Single
            ? SimulateSingleQueue(baseInputs, c)
            : SimulateMultipleQueues(baseInputs, c);

        return BuildResult(c.Seed, events, c.ServerCount);
    }

    public ScenarioComparisonResult Compare(SimulationConfiguration a, SimulationConfiguration b)
    {
        // Controlled experiments deliberately share the same seed and therefore the same
        // customer arrivals, service times and adverse events. Queue organization is the variable.
        if (a.Mode == SimulationMode.Controlled || b.Mode == SimulationMode.Controlled)
        {
            b.Seed = a.Seed;
            a.Mode = SimulationMode.Controlled;
            b.Mode = SimulationMode.Controlled;
        }

        return new ScenarioComparisonResult { ScenarioA = Run(a), ScenarioB = Run(b) };
    }

    private static BaseCustomer[] CreateBaseCustomers(SimulationConfiguration c, Random rng)
    {
        var customers = new BaseCustomer[c.CustomerCount];
        for (var i = 0; i < customers.Length; i++)
        {
            var arrival = c.ArrivalPattern == ArrivalPattern.AllWaiting
                ? 0
                : i == 0 ? 0 : customers[i - 1].Arrival + NextInterarrival(rng);
            var service = SampleService(c, rng);
            var adverse = c.AdverseEvents.Enabled && rng.NextDouble() < c.AdverseEvents.Probability;
            var extra = adverse ? NextRange(rng, c.AdverseEvents.AdditionalTimeMin, c.AdverseEvents.AdditionalTimeMax) : 0;
            customers[i] = new BaseCustomer(i + 1, arrival, service + extra, adverse);
        }
        return customers;
    }

    private static List<CustomerEvent> SimulateSingleQueue(BaseCustomer[] customers, SimulationConfiguration c)
    {
        var available = new double[c.ServerCount];
        var events = new List<CustomerEvent>(customers.Length);

        foreach (var customer in customers)
        {
            // The next person in a real common line goes to whichever cashier becomes free first.
            var server = Array.IndexOf(available, available.Min());
            var start = Math.Max(customer.Arrival, available[server]);
            var completion = start + customer.ServiceTime;
            available[server] = completion;

            events.Add(ToEvent(customer, queueIndex: 0, server, start, completion));
        }

        return events;
    }

    private static List<CustomerEvent> SimulateMultipleQueues(BaseCustomer[] customers, SimulationConfiguration c)
    {
        var available = new double[c.ServerCount];
        var assigned = Enumerable.Range(0, c.ServerCount).Select(_ => new List<CustomerEvent>()).ToArray();
        var routingRandom = new Random(c.Seed + 104729);

        for (var index = 0; index < customers.Length; index++)
        {
            var customer = customers[index];
            int queue;

            if (c.ArrivalPattern == ArrivalPattern.AllWaiting)
            {
                // Everyone is physically present before the experiment starts.
                // Distribute the initial crowd as evenly as possible across the cashiers.
                queue = index % c.ServerCount;
            }
            else
            {
                queue = c.QueueStrategy switch
                {
                    QueueStrategy.Random => routingRandom.Next(c.ServerCount),
                    QueueStrategy.ShortestQueue => FindShortestPhysicalQueue(assigned, customer.Arrival),
                    _ => 0
                };
            }

            var start = Math.Max(customer.Arrival, available[queue]);
            var completion = start + customer.ServiceTime;
            available[queue] = completion;
            assigned[queue].Add(ToEvent(customer, queue, queue, start, completion));
        }

        return assigned.SelectMany(x => x).OrderBy(x => x.CustomerId).ToList();
    }

    private static int FindShortestPhysicalQueue(List<CustomerEvent>[] queues, double arrival)
    {
        var bestQueue = 0;
        var bestLength = int.MaxValue;

        for (var i = 0; i < queues.Length; i++)
        {
            // At arrival time, only customers whose completion is still in the future are physically present.
            var length = queues[i].Count(x => x.CompletionTime > arrival);
            if (length < bestLength)
            {
                bestLength = length;
                bestQueue = i;
            }
        }

        return bestQueue;
    }

    private static CustomerEvent ToEvent(BaseCustomer c, int queueIndex, int server, double start, double completion) => new()
    {
        CustomerId = c.Id,
        ArrivalTime = c.Arrival,
        QueueIndex = queueIndex,
        ServerIndex = server,
        ServiceStartTime = start,
        WaitTime = start - c.Arrival,
        ServiceTime = c.ServiceTime,
        CompletionTime = completion,
        HadAdverseEvent = c.HadAdverse
    };

    private static SimulationResult BuildResult(int seed, List<CustomerEvent> events, int serverCount)
    {
        var total = events.Count == 0 ? 0 : events.Max(x => x.CompletionTime);
        var waits = events.Select(x => x.WaitTime).OrderBy(x => x).ToArray();
        var services = events.Select(x => x.ServiceTime).ToArray();
        var system = events.Select(x => x.CompletionTime - x.ArrivalTime).ToArray();
        var busy = new double[serverCount];
        foreach (var e in events) busy[e.ServerIndex] += e.ServiceTime;
        var utilization = busy.Select(x => total <= 0 ? 0 : Math.Min(1, x / total)).ToArray();
        var adverseCount = events.Count(x => x.HadAdverseEvent);

        return new SimulationResult
        {
            Seed = seed,
            ArrivalPattern = events.Any() && events.All(e => e.ArrivalTime == 0) ? ArrivalPattern.AllWaiting : ArrivalPattern.Continuous,
            Events = events,
            Statistics = new Statistics
            {
                AverageWait = Mean(waits),
                MinWait = waits.Length == 0 ? 0 : waits[0],
                MaxWait = waits.Length == 0 ? 0 : waits[^1],
                MedianWait = Percentile(waits, .50),
                P90Wait = Percentile(waits, .90),
                P95Wait = Percentile(waits, .95),
                P99Wait = Percentile(waits, .99),
                AverageServiceTime = Mean(services),
                TotalSimulationTime = total,
                CustomersServed = events.Count,
                CustomersWithAdverseEvents = adverseCount,
                AdverseEventPercentage = events.Count == 0 ? 0 : 100.0 * adverseCount / events.Count,
                AverageQueueLength = total <= 0 ? 0 : events.Sum(x => x.WaitTime) / total,
                MaxQueueLength = CalculateMaxQueueLength(events),
                MaxQueueLengthByQueue = CalculateMaxQueueLengthByQueue(events, serverCount),
                InitialQueueLengthByQueue = CalculateInitialQueueLengthByQueue(events, serverCount),
                AverageServerUtilization = utilization.Length == 0 ? 0 : utilization.Average(),
                Throughput = total <= 0 ? 0 : events.Count / total,
                AverageTimeInSystem = Mean(system),
                ServerUtilization = utilization
            }
        };
    }

    private static int CalculateMaxQueueLength(IEnumerable<CustomerEvent> events)
    {
        var maxByQueue = CalculateMaxQueueLengthByQueue(events, events.Select(x => x.QueueIndex).DefaultIfEmpty(-1).Max() + 1);
        return maxByQueue.Length == 0 ? 0 : maxByQueue.Sum();
    }


    private static int[] CalculateInitialQueueLengthByQueue(IEnumerable<CustomerEvent> events, int queueCount)
    {
        var result = new int[Math.Max(0, queueCount)];
        foreach (var e in events.Where(e => e.ArrivalTime == 0))
        {
            if (e.QueueIndex >= 0 && e.QueueIndex < result.Length) result[e.QueueIndex]++;
        }
        return result;
    }

    private static int[] CalculateMaxQueueLengthByQueue(IEnumerable<CustomerEvent> events, int queueCount)
    {
        var result = new int[Math.Max(0, queueCount)];
        foreach (var group in events.GroupBy(x => x.QueueIndex))
        {
            if (group.Key < 0 || group.Key >= result.Length) continue;

            var changes = new List<(double Time, int Delta)>();
            foreach (var e in group)
            {
                if (e.WaitTime > 0)
                {
                    changes.Add((e.ArrivalTime, +1));
                    changes.Add((e.ServiceStartTime, -1));
                }
            }

            var current = 0;
            var max = 0;
            foreach (var change in changes.OrderBy(x => x.Time).ThenBy(x => x.Delta))
            {
                current += change.Delta;
                max = Math.Max(max, current);
            }
            result[group.Key] = max;
        }
        return result;
    }

    private static double SampleService(SimulationConfiguration c, Random rng) =>
        c.ServiceTime.Type == ServiceTimeType.Fixed
            ? c.ServiceTime.Base
            : NextRange(rng, c.ServiceTime.Min, c.ServiceTime.Max);

    private static double NextInterarrival(Random rng) => NextRange(rng, 20, 80);
    private static double NextRange(Random rng, double min, double max) => min + rng.NextDouble() * (max - min);
    private static double Mean(IEnumerable<double> values) { var a = values.ToArray(); return a.Length == 0 ? 0 : a.Average(); }

    private static double Percentile(double[] sorted, double p)
    {
        if (sorted.Length == 0) return 0;
        var pos = (sorted.Length - 1) * p;
        var lo = (int)Math.Floor(pos);
        var hi = (int)Math.Ceiling(pos);
        return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
    }

    private sealed record BaseCustomer(int Id, double Arrival, double ServiceTime, bool HadAdverse);
}

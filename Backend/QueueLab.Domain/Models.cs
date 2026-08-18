namespace QueueLab.Domain;

public enum SimulationMode { FullRandom, Controlled }
public enum QueueStrategy { Single, Random, ShortestQueue }
public enum ServiceTimeType { Fixed, Variable }
public enum ArrivalPattern { Continuous, AllWaiting }

public sealed class SimulationConfiguration
{
    public SimulationMode Mode { get; set; } = SimulationMode.Controlled;
    public int CustomerCount { get; set; } = 100;
    public int ServerCount { get; set; } = 3;
    public QueueStrategy QueueStrategy { get; set; } = QueueStrategy.Single;
    public ArrivalPattern ArrivalPattern { get; set; } = ArrivalPattern.Continuous;
    public ServiceTimeConfiguration ServiceTime { get; set; } = new();
    public AdverseEventConfiguration AdverseEvents { get; set; } = new();
    public int Seed { get; set; } = 18472931;
}

public sealed class ServiceTimeConfiguration
{
    public ServiceTimeType Type { get; set; } = ServiceTimeType.Variable;
    public double Base { get; set; } = 60;
    public double Min { get; set; } = 30;
    public double Max { get; set; } = 90;
}

public sealed class AdverseEventConfiguration
{
    public bool Enabled { get; set; }
    public double Probability { get; set; } = 0.10;
    public double AdditionalTimeMin { get; set; } = 10;
    public double AdditionalTimeMax { get; set; } = 60;
}

public sealed class CustomerEvent
{
    public int CustomerId { get; init; }
    public double ArrivalTime { get; init; }
    public int QueueIndex { get; init; }
    public int ServerIndex { get; init; }
    public double ServiceStartTime { get; init; }
    public double WaitTime { get; init; }
    public double ServiceTime { get; init; }
    public double CompletionTime { get; init; }
    public bool HadAdverseEvent { get; init; }
}

public sealed class Statistics
{
    public double AverageWait { get; init; }
    public double MinWait { get; init; }
    public double MaxWait { get; init; }
    public double MedianWait { get; init; }
    public double P90Wait { get; init; }
    public double P95Wait { get; init; }
    public double P99Wait { get; init; }
    public double AverageServiceTime { get; init; }
    public double TotalSimulationTime { get; init; }
    public int CustomersServed { get; init; }
    public int CustomersWithAdverseEvents { get; init; }
    public double AdverseEventPercentage { get; init; }
    public double AverageQueueLength { get; init; }
    public int MaxQueueLength { get; init; }
    public int[] MaxQueueLengthByQueue { get; init; } = [];
    public int[] InitialQueueLengthByQueue { get; init; } = [];
    public double AverageServerUtilization { get; init; }
    public double Throughput { get; init; }
    public double AverageTimeInSystem { get; init; }
    public double[] ServerUtilization { get; init; } = [];
}

public sealed class SimulationResult
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public int Seed { get; init; }
    public ArrivalPattern ArrivalPattern { get; init; }
    public Statistics Statistics { get; init; } = new();
    public IReadOnlyList<CustomerEvent> Events { get; init; } = [];
}

public sealed class ScenarioComparisonRequest
{
    public SimulationConfiguration ScenarioA { get; set; } = new();
    public SimulationConfiguration ScenarioB { get; set; } = new();
}

public sealed class ScenarioComparisonResult
{
    public SimulationResult ScenarioA { get; init; } = new();
    public SimulationResult ScenarioB { get; init; } = new();
}

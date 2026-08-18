using QueueLab.Application;
using QueueLab.Domain;

namespace QueueLab.Tests;

public class SimulationEngineTests
{
    private readonly SimulationEngine engine = new();

    [Fact]
    public void ControlledSeedIsReproducible()
    {
        var c = new SimulationConfiguration { CustomerCount = 100, Seed = 42, Mode = SimulationMode.Controlled };
        var a = engine.Run(c); var b = engine.Run(c);
        Assert.Equal(a.Statistics.AverageWait, b.Statistics.AverageWait);
        Assert.Equal(a.Events.Select(x => x.CompletionTime), b.Events.Select(x => x.CompletionTime));
    }

    [Fact]
    public void SingleQueueUsesTheFirstAvailableCashier()
    {
        var c = new SimulationConfiguration
        {
            CustomerCount = 3, ServerCount = 2, QueueStrategy = QueueStrategy.Single,
            ServiceTime = new ServiceTimeConfiguration { Type = ServiceTimeType.Fixed, Base = 60 }
        };
        var result = engine.Run(c);
        Assert.Equal(new[] { 0, 1, 0 }, result.Events.Select(x => x.ServerIndex));
        Assert.Equal(0, result.Events[2].WaitTime);
    }

    [Fact]
    public void MultipleQueuesHaveOnePhysicalLinePerCashier()
    {
        var c = new SimulationConfiguration
        {
            CustomerCount = 6, ServerCount = 3, QueueStrategy = QueueStrategy.ShortestQueue,
            ServiceTime = new ServiceTimeConfiguration { Type = ServiceTimeType.Fixed, Base = 60 }
        };
        var result = engine.Run(c);
        Assert.Equal(3, result.Events.Select(x => x.QueueIndex).Distinct().Count());
        Assert.Equal(result.Events.Select(x => x.QueueIndex), result.Events.Select(x => x.ServerIndex));
    }

    [Fact]
    public void AllWaitingStartsWithEveryCustomerAlreadyPresent()
    {
        var single = new SimulationConfiguration
        {
            CustomerCount = 250, ServerCount = 3, QueueStrategy = QueueStrategy.Single,
            ArrivalPattern = ArrivalPattern.AllWaiting,
            ServiceTime = new ServiceTimeConfiguration { Type = ServiceTimeType.Fixed, Base = 60 }
        };
        var singleResult = engine.Run(single);
        Assert.All(singleResult.Events, e => Assert.Equal(0, e.ArrivalTime));
        Assert.Equal(250, singleResult.Statistics.InitialQueueLengthByQueue[0]);

        var multi = new SimulationConfiguration
        {
            CustomerCount = 250, ServerCount = 3, QueueStrategy = QueueStrategy.ShortestQueue,
            ArrivalPattern = ArrivalPattern.AllWaiting,
            ServiceTime = new ServiceTimeConfiguration { Type = ServiceTimeType.Fixed, Base = 60 }
        };
        var multiResult = engine.Run(multi);
        Assert.Equal(new[] { 84, 83, 83 }, multiResult.Statistics.InitialQueueLengthByQueue);
    }

    [Fact]
    public void FixedServiceTimeIsConstant()
    {
        var c = new SimulationConfiguration { CustomerCount = 20 };
        c.ServiceTime = new ServiceTimeConfiguration { Type = ServiceTimeType.Fixed, Base = 60 };
        var result = engine.Run(c);
        Assert.All(result.Events, e => Assert.Equal(60, e.ServiceTime));
    }

    [Fact]
    public void ZeroAdverseProbabilityProducesNoAdverseEvents()
    {
        var c = new SimulationConfiguration { CustomerCount = 100 };
        c.AdverseEvents = new AdverseEventConfiguration { Enabled = true, Probability = 0 };
        Assert.Equal(0, engine.Run(c).Statistics.CustomersWithAdverseEvents);
    }

    [Theory]
    [InlineData(QueueStrategy.Single)]
    [InlineData(QueueStrategy.Random)]
    [InlineData(QueueStrategy.ShortestQueue)]
    public void QueueStrategiesProduceResults(QueueStrategy strategy)
    {
        var c = new SimulationConfiguration { CustomerCount = 100, ServerCount = 3, QueueStrategy = strategy };
        Assert.Equal(100, engine.Run(c).Statistics.CustomersServed);
    }
}

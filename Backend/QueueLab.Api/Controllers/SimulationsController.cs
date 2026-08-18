using Microsoft.AspNetCore.Mvc;
using QueueLab.Application;
using QueueLab.Domain;

namespace QueueLab.Api.Controllers;

[ApiController]
[Route("api/simulations")]
public class SimulationsController(ISimulationEngine engine) : ControllerBase
{
    [HttpPost]
    public ActionResult<SimulationResult> Create([FromBody] SimulationConfiguration configuration)
    {
        var validation = SimulationValidator.Validate(configuration);
        if (validation.Count > 0) return BadRequest(new { errors = validation });
        return Ok(engine.Run(configuration));
    }

    [HttpPost("compare")]
    public ActionResult<ScenarioComparisonResult> Compare([FromBody] ScenarioComparisonRequest request)
    {
        var errors = SimulationValidator.Validate(request.ScenarioA)
            .Concat(SimulationValidator.Validate(request.ScenarioB))
            .ToList();
        if (errors.Count > 0) return BadRequest(new { errors });
        return Ok(engine.Compare(request.ScenarioA, request.ScenarioB));
    }

    [HttpGet("{id}")]
    public IActionResult Get(string id) =>
        NotFound(new { message = "The MVP is stateless; simulation results are returned by the POST request." });
}
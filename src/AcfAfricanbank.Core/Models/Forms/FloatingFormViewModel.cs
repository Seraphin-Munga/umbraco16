using System.ComponentModel;
using System.ComponentModel.DataAnnotations;

namespace AcfAfricanbank.Core.Models.Forms;

public class FloatingFormViewModel
{
    [Required]
    [DisplayName("First Name*")]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    [DisplayName("Surname*")]
    public string SurName { get; set; } = string.Empty;

    [Required]
    [DisplayName("E-mail*")]
    [EmailAddress]
    public string EmailAddress { get; set; } = string.Empty;

    [Required]
    [DisplayName("South African ID*")]
    public string SouthAfricanId { get; set; } = string.Empty;

    [Required]
    [DisplayName("Cellphone Number*")]
    public string CellphoneNumber { get; set; } = string.Empty;

    [DisplayName("No marketing information")]
    public bool CheckBox { get; set; }
}

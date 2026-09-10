using System;
using System.Web.WebPages;
using Umbraco.Core.Composing;
using Web.Models;

namespace Umbraco8.Components
{
    public class RegisterAmpPageComposer : ComponentComposer<RegisterAmpPageComponent>
    {
    }

    public class RegisterAmpPageComponent : Umbraco.Core.Composing.IComponent
    {
        public void Initialize()
        {
            DisplayModeProvider.Instance.Modes.Clear();
            DisplayModeProvider.Instance.Modes.Add(new GoogleAmpDisplayMode());
            DisplayModeProvider.Instance.Modes.Add(new DefaultDisplayMode());
        }

        public void Terminate()
        {
            throw new NotImplementedException();
        }
    }
}
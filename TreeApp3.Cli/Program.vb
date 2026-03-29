Module Program
    Sub Main(args As String())
        Dim compactMode As Boolean = False
        Dim canvasWidth As Integer = 1200
        Dim canvasHeight As Integer = 800

        For i = 0 To args.Length - 1
            Dim arg = args(i)
            If String.Equals(arg, "--compact", StringComparison.OrdinalIgnoreCase) Then
                compactMode = True
            ElseIf String.Equals(arg, "--width", StringComparison.OrdinalIgnoreCase) AndAlso i + 1 < args.Length Then
                Integer.TryParse(args(i + 1), canvasWidth)
                i += 1
            ElseIf String.Equals(arg, "--height", StringComparison.OrdinalIgnoreCase) AndAlso i + 1 < args.Length Then
                Integer.TryParse(args(i + 1), canvasHeight)
                i += 1
            End If
        Next

        Dim report = modTreeHarness.RunTreeLayoutSmokeTest(canvasWidth, canvasHeight, compactMode)
        Console.WriteLine(report)
    End Sub
End Module

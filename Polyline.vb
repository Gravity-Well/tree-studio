<Serializable()> Public Class Polyline

    Public dx As Long
    Public dy As Long
    Public Link As Polyline

    Sub New(ByVal dx As Long, ByVal dy As Long, ByRef Link As Polyline)

        Me.dx = dx
        Me.dy = dy
        Me.Link = Link
    End Sub
End Class

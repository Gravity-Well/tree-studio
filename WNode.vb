Imports System.Collections.Generic
Imports System.Drawing

<Serializable()>
Public Class WNode
    Public Property Label As String
    Public Property Description As String
    Public Property Parent As WNode
    Public Property Children As New List(Of WNode)()
    Public Property Position As Point
    Public Property Width As Integer = 100
    Public Property Height As Integer = 50
    Public Property Border As Integer = 10
    Public Property Confidence As Byte
    Public Property NodeType As Byte
    Public Property NodeStyle As Byte
    Public Property Expanded As Boolean = True
    Public Property ChildrenVisible As Boolean = True

    ' Legacy support for Child (first child in the list)
    Public Property Child As WNode
        Get
            Return If(Children.Count > 0, Children(0), Nothing)
        End Get
        Set(value As WNode)
            If Children.Count = 0 Then
                Children.Add(value)
            Else
                Children(0) = value
            End If
        End Set
    End Property

    ' Legacy support for Sibling (assumes linear linked structure within children)
    Public Property Sibling As WNode
        Get
            If Parent IsNot Nothing Then
                Dim siblings = Parent.Children
                Dim index = siblings.IndexOf(Me)
                If index >= 0 AndAlso index < siblings.Count - 1 Then
                    Return siblings(index + 1)
                End If
            End If
            Return Nothing
        End Get
        Set(value As WNode)
            If Parent IsNot Nothing Then
                Dim siblings = Parent.Children
                Dim index = siblings.IndexOf(Me)
                If index >= 0 AndAlso index < siblings.Count - 1 Then
                    siblings(index + 1) = value
                End If
            End If
        End Set
    End Property

    ' Constructor
    Public Sub New(label As String, parent As WNode)
        Me.Label = label
        Me.Parent = parent
    End Sub
End Class
